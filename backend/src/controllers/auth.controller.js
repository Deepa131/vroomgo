const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/user.model");
const { HttpError } = require("../utils/httpError");
const { sendEmail } = require("../config/email");
const { logEvent } = require("../utils/audit");
const { isStrongPassword, passwordPolicyMessage } = require("../utils/passwordPolicy");
const { registerIpFailure, registerIpSuccess } = require("../utils/ipAccessControl");
const { sendSecurityAlert } = require("../utils/alerts");
const {
  JWT_SECRET,
  FRONTEND_URL,
  RESET_PASSWORD_URL,
  RESET_PASSWORD_EXPIRE_MINUTES,
  OTP_TOKEN_SECRET,
  OTP_TOKEN_EXPIRE,
  AUTH_COOKIE_NAME,
  NODE_ENV,
  JWT_EXPIRE,
  MAGIC_LINK_SECRET,
  MAGIC_LINK_EXPIRE_MINUTES,
} = require("../config");

// Decrypts phone because every response in this file is the account owner
// looking at their OWN data (register/login/profile) - never someone else's.
const sanitize = (userDoc) => {
  const obj = userDoc.toObject ? userDoc.toObject() : userDoc;
  const {
    password,
    resetPasswordToken,
    resetPasswordExpire,
    otpCodeHash,
    otpExpire,
    otpAttempts,
    passwordHistory,
    failedLoginAttempts,
    lockUntil,
    magicLinkNonce,
    ...safe
  } = obj;
  return { ...safe, phone: userDoc.getDecryptedPhone ? userDoc.getDecryptedPhone() : safe.phone };
};

// Parses simple "30d" / "12h" / "45m" / "60s" duration strings into ms, so the
// httpOnly cookie's maxAge stays in sync with the JWT's own expiry.
const parseDurationToMs = (value) => {
  const match = /^(\d+)([smhd])$/.exec(String(value).trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback: 7 days
  const amount = Number(match[1]);
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }[match[2]];
  return amount * unitMs;
};

/**
 * Issues the real access token as an httpOnly, SameSite, Secure(prod) cookie.
 * The cookie can never be read by JavaScript (defends against token theft via
 * XSS) and is not sent on cross-site requests (defends against CSRF).
 */
const setAuthCookie = (res, user, req) => {
  const token = user.getSignedJwtToken(req?.headers?.["user-agent"]);
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: NODE_ENV === "production",
    maxAge: parseDurationToMs(JWT_EXPIRE),
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    secure: NODE_ENV === "production",
  });
};

/**
 * Short-lived, single-purpose token issued after step 1 (password correct)
 * and required for step 2 (OTP verification). It intentionally:
 *   - is signed with a DIFFERENT secret than the real access token
 *     (OTP_TOKEN_SECRET, not JWT_SECRET) so it can never be mistaken for
 *     one, even if someone reused it against a protected route
 *   - carries a `purpose: "otp"` claim the verify-otp handler checks
 *   - expires in a few minutes (OTP_TOKEN_EXPIRE), matching the OTP's own
 *     short lifetime
 * This means possessing a valid password is never, by itself, enough to
 * get an access token - it only unlocks the OTP step.
 */
const issueOtpToken = (userId) =>
  jwt.sign({ id: userId, purpose: "otp" }, OTP_TOKEN_SECRET, { expiresIn: OTP_TOKEN_EXPIRE });

const register = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, role, phone } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "fullName, email and password are required",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: passwordPolicyMessage });
    }

    if (confirmPassword && confirmPassword !== password) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const allowedRoles = ["customer", "vendor"];
    const finalRole = allowedRoles.includes(role) ? role : "customer";

    const newUser = await UserModel.create({
      fullName,
      email: email.toLowerCase(),
      password,
      phone,
      role: finalRole,
    });

    await logEvent({ action: "REGISTER", userId: newUser._id, email: newUser.email, req });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: sanitize(newUser),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * STEP 1 of login: verify email + password only.
 *
 * WHAT/WHY (2FA):
 *   "Something you know" (the password) is no longer enough on its own -
 *   we also require "something you have" (access to the account's email
 *   inbox, proven by reading a one-time code we just sent there). This is
 *   what stops a leaked/guessed/reused password from being sufficient to
 *   take over an account.
 *
 *   Note this endpoint deliberately does NOT return a real access token.
 *   It returns a short-lived otpToken instead, and the client must call
 *   /verify-otp with the code from their email to actually get a session.
 *   Returning the same generic message whether the email exists or not
 *   would leak less info, but since this is a login (not
 *   forgot-password) endpoint we still need to distinguish "wrong
 *   credentials" from "check your email" - so we keep the invalid-
 *   credentials message generic ("Invalid credentials", not "wrong
 *   password" or "no such user") to avoid user enumeration.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
      "+password +failedLoginAttempts +lockUntil"
    );
    if (!user) {
      await logEvent({ action: "LOGIN_FAILED", email: email.toLowerCase(), req, details: "No such account" });
      await registerIpFailure(req.ip, req);
      throw new HttpError(401, "Invalid credentials");
    }

    // Account-level lockout: brute-force defense independent of IP-based
    // rate limiting - this blocks the ACCOUNT even from a different IP.
    if (user.isLocked()) {
      await logEvent({ action: "LOGIN_BLOCKED_LOCKED", userId: user._id, email: user.email, req });
      await registerIpFailure(req.ip, req);
      return res.status(423).json({
        success: false,
        message: "Account temporarily locked due to too many failed attempts. Please try again later.",
      });
    }

    const validPassword = await user.matchPassword(password);
    if (!validPassword) {
      const justLocked = await user.registerFailedLogin();
      await logEvent({
        action: justLocked ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        userId: user._id,
        email: user.email,
        req,
      });
      await registerIpFailure(req.ip, req);
      if (justLocked) {
        await sendSecurityAlert(
          "VroomGo security alert: account locked",
          `Account ${user.email} was locked after too many failed login attempts (IP: ${req.ip || "unknown"}).`
        );
        return res.status(423).json({
          success: false,
          message: "Account locked due to too many failed attempts. Please try again in a few minutes.",
        });
      }
      throw new HttpError(401, "Invalid credentials");
    }

    registerIpSuccess(req.ip);
    await user.resetFailedLogins();

    // Password expiry: a password older than PASSWORD_EXPIRY_DAYS must be
    // reset before a session is issued.
    if (user.isPasswordExpired()) {
      await logEvent({ action: "LOGIN_PASSWORD_EXPIRED", userId: user._id, email: user.email, req });
      return res.status(403).json({
        success: false,
        passwordExpired: true,
        message: "Your password has expired and must be reset before you can log in.",
      });
    }

    if (!user.isTwoFactorEnabled) {
      // Escape hatch if you ever make 2FA opt-in/out per user.
      setAuthCookie(res, user, req);
      await logEvent({ action: "LOGIN_SUCCESS", userId: user._id, email: user.email, req });
      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: sanitize(user),
      });
    }

    const otp = await user.generateOtp();

    const html = `
      <p>Your VroomGo verification code is:</p>
      <h2 style="letter-spacing:4px;">${otp}</h2>
      <p>This code expires in a few minutes. If you did not try to log in, you can safely ignore this email.</p>
    `;
    try {
      await sendEmail(user.email, "Your VroomGo login code", html);
    } catch (e) {
      console.error("OTP email send failed:", e.message);
      throw new HttpError(500, "Could not send verification code. Please try again.");
    }

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      message: "A verification code has been sent to your email",
      otpToken: issueOtpToken(user._id.toString()),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * STEP 2 of login: consume the otpToken from step 1 + the code the user
 * received by email, and only NOW issue the real session cookie.
 */
const verifyOtp = async (req, res) => {
  try {
    const { otpToken, code } = req.body;
    if (!otpToken || !code) {
      return res.status(400).json({ success: false, message: "otpToken and code are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(otpToken, OTP_TOKEN_SECRET);
    } catch (e) {
      throw new HttpError(401, "Verification session expired. Please log in again.");
    }
    if (!decoded || decoded.purpose !== "otp" || !decoded.id) {
      throw new HttpError(401, "Invalid verification session.");
    }

    const user = await UserModel.findById(decoded.id).select("+otpCodeHash +otpExpire +otpAttempts");
    if (!user) throw new HttpError(401, "User not found");

    const result = await user.verifyOtp(code);
    if (!result.ok) {
      await logEvent({ action: "OTP_FAILED", userId: user._id, email: user.email, req, details: result.reason });
      await registerIpFailure(req.ip, req);
      throw new HttpError(400, result.reason);
    }

    registerIpSuccess(req.ip);
    setAuthCookie(res, user, req);
    await logEvent({ action: "LOGIN_SUCCESS", userId: user._id, email: user.email, req });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: sanitize(user),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Lets the user request a fresh code (e.g. the first one expired) without
 * re-entering their password, but still scoped to the same short-lived
 * otpToken so it can't be used to spam arbitrary accounts.
 */
const resendOtp = async (req, res) => {
  try {
    const { otpToken } = req.body;
    if (!otpToken) return res.status(400).json({ success: false, message: "otpToken is required" });

    let decoded;
    try {
      decoded = jwt.verify(otpToken, OTP_TOKEN_SECRET);
    } catch (e) {
      throw new HttpError(401, "Verification session expired. Please log in again.");
    }
    if (!decoded || decoded.purpose !== "otp" || !decoded.id) {
      throw new HttpError(401, "Invalid verification session.");
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) throw new HttpError(401, "User not found");

    const otp = await user.generateOtp();
    const html = `<p>Your new VroomGo verification code is:</p><h2 style="letter-spacing:4px;">${otp}</h2>`;
    await sendEmail(user.email, "Your VroomGo login code", html);

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email",
      otpToken: issueOtpToken(user._id.toString()),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Returns the currently logged-in user, read from the httpOnly cookie via
// authorizedMiddleware. The frontend calls this on load to restore a session
// since it can no longer read the token itself out of localStorage.
const getMe = async (req, res) => {
  return res.status(200).json({ success: true, data: sanitize(req.user) });
};

const logout = async (req, res) => {
  // Best-effort: identify who's logging out for the audit trail, but never
  // block clearing the cookie even if the token is already expired/invalid.
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded?.id) {
        const user = await UserModel.findById(decoded.id);
        if (user) await logEvent({ action: "LOGOUT", userId: user._id, email: user.email, req });
      }
    } catch (e) {
      // token already invalid/expired - nothing to log, still clear the cookie below
    }
  }

  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: "Logged out" });
};

const updateProfilePicture = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Profile picture is required" });
    }

    const filePath = `/public/profile_pictures/${req.file.filename}`;
    const updated = await UserModel.findByIdAndUpdate(
      req.user._id,
      { profilePicture: filePath },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile picture updated",
      data: sanitize(updated),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;
    if (req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only update your own profile",
      });
    }

    const updateData = { ...req.body };
    delete updateData.password;
    delete updateData.role;
    delete updateData.email;

    if (req.file) {
      updateData.profilePicture = `/public/profile_pictures/${req.file.filename}`;
    }

    // Load as a document (not a plain update) so the pre-save hook encrypts
    // a changed phone number instead of it being written in plaintext.
    const userDoc = await UserModel.findById(id);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    Object.assign(userDoc, updateData);
    await userDoc.save();

    await logEvent({ action: "PROFILE_UPDATE", userId: userDoc._id, email: userDoc.email, req });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: sanitize(userDoc),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email exists, a reset link has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = new Date(Date.now() + RESET_PASSWORD_EXPIRE_MINUTES * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await logEvent({ action: "PASSWORD_RESET_REQUESTED", userId: user._id, email: user.email, req });

    const baseUrl = RESET_PASSWORD_URL || `${FRONTEND_URL}/reset-password`;
    const resetLink = `${baseUrl}/${resetToken}`;

    const html = `
      <p>You requested a password reset for your VroomGo account.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    try {
      await sendEmail(user.email, "Reset your VroomGo password", html);
    } catch (e) {
      console.error("Email send failed:", e.message);
    }

    return res.status(200).json({
      success: true,
      message: "If that email exists, a reset link has been sent",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: passwordPolicyMessage });
    }
    if (confirmPassword && confirmPassword !== password) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await UserModel.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpire: { $gt: new Date() },
    }).select("+password +passwordHistory");

    if (!user) throw new HttpError(400, "Invalid or expired token");

    // Password reuse prevention: reject if it matches the current password
    // or any of the last PASSWORD_HISTORY_LIMIT previous hashes.
    if (await user.isPasswordReused(password)) {
      return res.status(400).json({
        success: false,
        message: "You cannot reuse a recent password. Please choose a different one.",
      });
    }

    user.rotatePasswordHistory();
    user.password = password; // pre-save hook hashes it and refreshes passwordChangedAt
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await logEvent({ action: "PASSWORD_RESET", userId: user._id, email: user.email, req });

    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * -----------------------------------------------------------------------
 * Passwordless "magic link" login (advanced/optional authentication)
 * -----------------------------------------------------------------------
 * An alternative to password + OTP: the user proves ownership of their
 * inbox alone. The link:
 *   - is signed with its own secret (MAGIC_LINK_SECRET), never JWT_SECRET
 *   - carries a random nonce that is stored on the user document and
 *     cleared the instant the link is used, making it strictly one-time-use
 *   - is short-lived (MAGIC_LINK_EXPIRE_MINUTES)
 *   - deliberately returns the same generic response whether or not the
 *     email exists, to avoid leaking which emails are registered
 * A successful magic-link login still goes through setAuthCookie, so it
 * gets the exact same device-bound, httpOnly, SameSite=strict cookie as a
 * normal password login.
 */
const requestMagicLink = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (user) {
      const nonce = crypto.randomBytes(16).toString("hex");
      user.magicLinkNonce = nonce;
      await user.save({ validateBeforeSave: false });

      const token = jwt.sign({ id: user._id.toString(), purpose: "magic-link", nonce }, MAGIC_LINK_SECRET, {
        expiresIn: `${MAGIC_LINK_EXPIRE_MINUTES}m`,
      });
      const link = `${FRONTEND_URL}/magic-link/verify?token=${token}`;

      const html = `
        <p>Click the link below to sign in to VroomGo without a password:</p>
        <p><a href="${link}">Sign in to VroomGo</a></p>
        <p>This link expires in ${MAGIC_LINK_EXPIRE_MINUTES} minutes and can only be used once. If you did not request this, you can safely ignore this email.</p>
      `;

      try {
        await sendEmail(user.email, "Your VroomGo sign-in link", html);
      } catch (e) {
        console.error("Magic link email send failed:", e.message);
      }

      await logEvent({ action: "MAGIC_LINK_REQUESTED", userId: user._id, email: user.email, req });
    }

    return res.status(200).json({
      success: true,
      message: "If that email exists, a sign-in link has been sent.",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Token is required" });

    let decoded;
    try {
      decoded = jwt.verify(token, MAGIC_LINK_SECRET);
    } catch (e) {
      throw new HttpError(401, "This sign-in link is invalid or has expired.");
    }
    if (!decoded || decoded.purpose !== "magic-link" || !decoded.id || !decoded.nonce) {
      throw new HttpError(401, "This sign-in link is invalid.");
    }

    const user = await UserModel.findById(decoded.id).select("+magicLinkNonce");
    if (!user) throw new HttpError(401, "This sign-in link is invalid.");

    if (!user.magicLinkNonce || user.magicLinkNonce !== decoded.nonce) {
      // Already used, or superseded by a more recently requested link.
      throw new HttpError(401, "This sign-in link has already been used or has expired.");
    }

    // One-time use: clear the nonce immediately so this exact token can
    // never be replayed, even if it's still within its expiry window.
    user.magicLinkNonce = undefined;
    await user.save({ validateBeforeSave: false });

    setAuthCookie(res, user, req);
    await logEvent({ action: "LOGIN_SUCCESS", userId: user._id, email: user.email, req, details: "via magic link" });
    registerIpSuccess(req.ip);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: sanitize(user),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * -----------------------------------------------------------------------
 * Profile data export / import (privacy-aligned data portability)
 * -----------------------------------------------------------------------
 * Export returns exactly the same shape the user already sees on their own
 * profile (never another user's data - always scoped to req.user, set by
 * authorizedMiddleware). Import is deliberately allow-listed to a small
 * set of user-editable fields so it can never be used to smuggle in a role
 * change, a different email, or any other privileged field (mass
 * assignment / privilege escalation protection).
 */
const IMPORTABLE_PROFILE_FIELDS = ["fullName", "phone"];

const exportProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await logEvent({ action: "PROFILE_EXPORT", userId: user._id, email: user.email, req });

    return res.status(200).json({
      success: true,
      exportedAt: new Date().toISOString(),
      data: sanitize(user),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const importProfile = async (req, res) => {
  try {
    const payload = req.body && typeof req.body.data === "object" ? req.body.data : req.body;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ success: false, message: "Invalid import payload" });
    }

    const update = {};
    for (const field of IMPORTABLE_PROFILE_FIELDS) {
      if (typeof payload[field] === "string" && payload[field].trim() !== "") {
        update[field] = payload[field].trim();
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: `No importable fields found. Allowed fields: ${IMPORTABLE_PROFILE_FIELDS.join(", ")}`,
      });
    }

    // Loaded as a document (not a raw update) so the pre-save hook
    // encrypts a changed phone number, exactly like updateUserProfile.
    const userDoc = await UserModel.findById(req.user._id);
    if (!userDoc) return res.status(404).json({ success: false, message: "User not found" });

    Object.assign(userDoc, update);
    await userDoc.save();

    await logEvent({ action: "PROFILE_IMPORT", userId: userDoc._id, email: userDoc.email, req });

    return res.status(200).json({
      success: true,
      message: "Profile data imported successfully",
      data: sanitize(userDoc),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  register,
  login,
  verifyOtp,
  resendOtp,
  getMe,
  logout,
  updateProfilePicture,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  requestMagicLink,
  verifyMagicLink,
  exportProfile,
  importProfile,
};
