const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/user.model");
const { JWT_SECRET, AUTH_COOKIE_NAME, NODE_ENV } = require("../config");
const { HttpError } = require("../utils/httpError");
const { hashUserAgent } = require("../utils/deviceBinding");
const { logEvent } = require("../utils/audit");
const { sendSecurityAlert } = require("../utils/alerts");

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    secure: NODE_ENV === "production",
  });
};

const authorizedMiddleware = async (req, res, next) => {
  try {
    // The access token now lives only in an httpOnly cookie (see
    // auth.controller.js) so client-side JavaScript can never read it -
    // this closes the XSS-token-theft gap that localStorage/Bearer had.
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) throw new HttpError(401, "Unauthorized: No session found");

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) {
      throw new HttpError(401, "Unauthorized: Token invalid");
    }

    // Session/device binding: reject the session outright if it's being
    // replayed from a different User-Agent than the one that created it
    // (see utils/deviceBinding.js for the full rationale/limitations).
    if (decoded.uaHash) {
      const currentHash = hashUserAgent(req.headers["user-agent"]);
      if (currentHash !== decoded.uaHash) {
        clearAuthCookie(res);
        await logEvent({
          action: "SESSION_DEVICE_MISMATCH",
          userId: decoded.id,
          req,
          details: "Session cookie replayed from a different User-Agent than it was issued for",
        });
        await sendSecurityAlert(
          "VroomGo security alert: session/device mismatch",
          `A session for user ${decoded.id} was rejected because it was used from a different device/browser than the one it was issued to (IP: ${req.ip || "unknown"}).`
        );
        throw new HttpError(401, "Session invalid for this device. Please log in again.");
      }
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) throw new HttpError(401, "Unauthorized: User not found");

    req.user = user;
    next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || "Unauthorized",
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, "Unauthorized: User missing");

      if (!roles.includes(req.user.role)) {
        throw new HttpError(403, `Forbidden: Role '${req.user.role}' not authorized`);
      }

      next();
    } catch (error) {
      return res.status(error.statusCode || 403).json({
        success: false,
        message: error.message || "Forbidden",
      });
    }
  };
};

const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized: User missing");

    if (req.user.role !== "admin") {
      throw new HttpError(403, "Forbidden: Only admins can access this resource");
    }

    next();
  } catch (error) {
    return res.status(error.statusCode || 403).json({
      success: false,
      message: error.message || "Forbidden",
    });
  }
};

module.exports = { authorizedMiddleware, authorizeRoles, adminMiddleware };
