const { AuditLogModel } = require("../models/auditLog.model");

/**
 * Writes one security-relevant event to the audit log collection.
 * Never throws - a logging failure must not break the request it's logging.
 */
const logEvent = async ({ action, userId = null, email = null, req = null, details = "" }) => {
  try {
    await AuditLogModel.create({
      action,
      user: userId || undefined,
      email: email || undefined,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || undefined,
      userAgent: req?.headers?.["user-agent"] || undefined,
      details,
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};

module.exports = { logEvent };
