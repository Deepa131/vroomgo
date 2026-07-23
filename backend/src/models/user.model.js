const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  JWT_SECRET,
  JWT_EXPIRE,
  OTP_EXPIRE_MINUTES,
  PASSWORD_HISTORY_LIMIT,
  PASSWORD_EXPIRY_DAYS,
  MAX_LOGIN_ATTEMPTS,
  LOCK_TIME_MINUTES,
} = require("../config");
const { encrypt, decrypt } = require("../utils/crypto");
const { hashUserAgent } = require("../utils/deviceBinding");

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    fullName: { type: String, trim: true },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 8,
      select: false,
    },
    // Stored as AES-256-GCM ciphertext ("iv:tag:cipher"), never in plaintext.
    // Encrypted automatically in the pre-save hook below; decrypted only via
    // getDecryptedPhone(), which controllers call solely for the profile owner.
    phone: { type: String, trim: true, default: "" },
    role: {
      type: String,
      enum: ["customer", "vendor", "admin"],
      default: "customer",
      required: true,
    },
    profilePicture: {
      type: String,
      default: "default-avatar.png",
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
    },

    // --- Password reuse prevention & expiry ---
    // Up to PASSWORD_HISTORY_LIMIT previous bcrypt hashes; a new password is
    // rejected if it matches the current password or any entry here.
    passwordHistory: {
      type: [String],
      default: [],
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },

    // --- Account lockout (brute-force defense) ---
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },

    // --- Two-Factor Authentication (email OTP) ---
    // We never store the OTP itself, only a salted hash of it, the same way
    // we never store the raw password - if the DB ever leaked, the codes
    // inside it would be useless without also breaking bcrypt.
    otpCodeHash: {
      type: String,
      select: false,
    },
    otpExpire: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    // Lets an account opt out of 2FA in future if you want to make it
    // user-configurable; defaults to true so every login is protected today.
    isTwoFactorEnabled: {
      type: Boolean,
      default: true,
    },

    // --- Passwordless "magic link" login ---
    // A random nonce embedded in every magic-link token that's issued. It is
    // cleared as soon as a link is consumed (one-time use) and overwritten
    // whenever a new link is requested (so only the most recently requested
    // link is ever valid), never exposed in any API response.
    magicLinkNonce: {
      type: String,
      select: false,
    },

    // --- Two-Factor Authentication (TOTP / authenticator app) ---
    // RFC 6238 time-based one-time password, as an alternative to the email
    // OTP above. When isTotpEnabled is true, login's second factor is
    // verified against totpSecret (via speakeasy) instead of the emailed
    // code. totpTempSecret holds a secret that has been generated but not
    // yet confirmed (see setupTotp/confirmTotp) - it only becomes the real
    // totpSecret once the user proves they scanned the QR code correctly.
    totpSecret: {
      type: String,
      select: false,
    },
    totpTempSecret: {
      type: String,
      select: false,
    },
    isTotpEnabled: {
      type: Boolean,
      default: false,
    },

    // --- OAuth login (Google) ---
    // "local" accounts log in with a password; "google" accounts were
    // created via / linked to Google Sign-In and have no password the user
    // knows (a random one is generated so the schema's required password
    // field is still satisfied, but it is never shared with the user).
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
  }

  if (this.isModified("phone") && this.phone) {
    this.phone = encrypt(this.phone);
  }
});

// `userAgent`, when provided, binds the issued session to that device (see
// utils/deviceBinding.js) by embedding a hash of it as a JWT claim.
UserSchema.methods.getSignedJwtToken = function (userAgent) {
  const payload = { id: this._id.toString() };
  if (userAgent) payload.uaHash = hashUserAgent(userAgent);
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
};

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Returns the plaintext phone number. Only ever call this for the account
// owner (e.g. their own profile/login response) - never for admin listings.
UserSchema.methods.getDecryptedPhone = function () {
  try {
    return decrypt(this.phone);
  } catch (err) {
    return "";
  }
};

// --- Password reuse prevention & 90-day expiry ---

// True if `candidate` matches the current password or any of the last
// PASSWORD_HISTORY_LIMIT previous password hashes.
UserSchema.methods.isPasswordReused = async function (candidate) {
  const allHashes = [this.password, ...(this.passwordHistory || [])];
  for (const hash of allHashes) {
    if (hash && (await bcrypt.compare(candidate, hash))) return true;
  }
  return false;
};

// Pushes the current (pre-change) password hash onto history, capped at
// PASSWORD_HISTORY_LIMIT entries, then lets the caller assign the new
// password (the pre-save hook above hashes it).
UserSchema.methods.rotatePasswordHistory = function () {
  this.passwordHistory = [this.password, ...(this.passwordHistory || [])].slice(
    0,
    PASSWORD_HISTORY_LIMIT
  );
};

UserSchema.methods.isPasswordExpired = function () {
  if (!this.passwordChangedAt) return false;
  const ageMs = Date.now() - this.passwordChangedAt.getTime();
  return ageMs > PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
};

// --- Account lockout (brute-force defense) ---

UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

// Call after a failed password check. Locks the account for LOCK_TIME_MINUTES
// once MAX_LOGIN_ATTEMPTS consecutive failures are reached.
UserSchema.methods.registerFailedLogin = async function () {
  // A previous lock that has already expired starts a fresh attempt count.
  if (this.lockUntil && this.lockUntil.getTime() <= Date.now()) {
    this.failedLoginAttempts = 0;
    this.lockUntil = undefined;
  }

  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;

  let justLocked = false;
  if (this.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
    this.failedLoginAttempts = 0;
    justLocked = true;
  }

  await this.save({ validateBeforeSave: false });
  return justLocked;
};

UserSchema.methods.resetFailedLogins = async function () {
  if (!this.failedLoginAttempts && !this.lockUntil) return;
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
  await this.save({ validateBeforeSave: false });
};

// Generates a fresh 6-digit OTP, stores only its bcrypt hash + expiry on the
// user document, and returns the PLAIN code so the caller can email it. The
// plain code is never persisted anywhere.
UserSchema.methods.generateOtp = async function () {
  const code = String(crypto.randomInt(100000, 1000000)); // 6 digits, 100000-999999
  this.otpCodeHash = await bcrypt.hash(code, 10);
  this.otpExpire = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
  this.otpAttempts = 0;
  await this.save({ validateBeforeSave: false });
  return code;
};

UserSchema.methods.verifyOtp = async function (candidate) {
  if (!this.otpCodeHash || !this.otpExpire) return { ok: false, reason: "No OTP was requested" };
  if (this.otpExpire.getTime() < Date.now()) return { ok: false, reason: "OTP has expired" };
  if (this.otpAttempts >= 5) return { ok: false, reason: "Too many incorrect attempts" };

  const match = await bcrypt.compare(String(candidate), this.otpCodeHash);
  if (!match) {
    this.otpAttempts += 1;
    await this.save({ validateBeforeSave: false });
    return { ok: false, reason: "Incorrect code" };
  }

  // one-time use: clear it immediately once consumed successfully
  this.otpCodeHash = undefined;
  this.otpExpire = undefined;
  this.otpAttempts = 0;
  await this.save({ validateBeforeSave: false });
  return { ok: true };
};

const UserModel = mongoose.model("User", UserSchema);

module.exports = { UserModel };