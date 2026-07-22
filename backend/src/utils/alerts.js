const { EventEmitter } = require("events");
const { sendEmail } = require("../config/email");
const { ALERT_EMAIL } = require("../config");

/**
 * -----------------------------------------------------------------------
 * Real-time security monitoring & alerting
 * -----------------------------------------------------------------------
 * Every high-severity security event (account lockout, IP auto-block,
 * session/device mismatch, manual IP block by an admin, etc) is pushed
 * through this module in two ways:
 *
 *   1. Email - a fire-and-forget notification to ALERT_EMAIL, reusing the
 *      same mail transport the app already has configured for OTPs and
 *      password resets.
 *   2. Live stream - an in-process EventEmitter that the admin dashboard's
 *      Server-Sent-Events endpoint (GET /api/admin/alerts/stream) reads
 *      from, so admins see the event appear in the UI within a second or
 *      two, without polling.
 *
 * A single Node process + EventEmitter is sufficient for this assignment's
 * single-instance deployment; a horizontally-scaled deployment would swap
 * this for a shared pub/sub (Redis, etc.) without changing the call sites.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

const broadcastAlert = (event) => {
  emitter.emit("alert", { ...event, at: new Date().toISOString() });
};

const subscribeToAlerts = (listener) => {
  emitter.on("alert", listener);
  return () => emitter.off("alert", listener);
};

/**
 * Never throws - a failure to alert must never break the request (login
 * attempt, IP check, etc) that triggered the alert in the first place.
 */
const sendSecurityAlert = async (subject, message) => {
  broadcastAlert({ subject, message });

  if (!ALERT_EMAIL) return;

  try {
    await sendEmail(ALERT_EMAIL, subject, `<p>${message}</p>`);
  } catch (err) {
    console.error("Security alert email failed:", err.message);
  }
};

module.exports = { sendSecurityAlert, subscribeToAlerts, broadcastAlert };
