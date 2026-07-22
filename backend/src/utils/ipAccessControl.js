const { IpAccessModel } = require("../models/ipAccess.model");
const { IP_MAX_FAILURES, IP_FAILURE_WINDOW_MINUTES, IP_BLOCK_MINUTES } = require("../config");
const { logEvent } = require("./audit");
const { sendSecurityAlert } = require("./alerts");

/**
 * -----------------------------------------------------------------------
 * System-wide IP-level brute-force protection
 * -----------------------------------------------------------------------
 * This is deliberately independent of the per-account lockout already in
 * user.model.js: an attacker spraying many different email addresses from
 * one IP never triggers any single account's lockout, but should still get
 * cut off at the IP level. Two layers work together:
 *
 *   1. AUTOMATIC (in-memory sliding window): after IP_MAX_FAILURES failed
 *      logins/OTP attempts from the same IP within IP_FAILURE_WINDOW_MINUTES,
 *      that IP is blocked for IP_BLOCK_MINUTES and a real-time security
 *      alert fires. A single Node process's memory is sufficient for this
 *      assignment's single-instance deployment; a multi-instance production
 *      deployment would move this map to Redis without changing call sites.
 *   2. MANUAL (MongoDB-backed): admins can permanently block a known-bad IP
 *      or allow-list a trusted one via /api/admin/ip-access. The allow-list
 *      always wins (bypasses both the manual block list and the automatic
 *      lockout), which is what lets an admin unblock themselves or a
 *      trusted office/VPN IP that got caught by the automatic layer.
 */

const failureLog = new Map(); // ip -> array of failure timestamps (ms)
const autoBlocked = new Map(); // ip -> blockedUntil (ms)

const now = () => Date.now();

const isAutoBlocked = (ip) => {
  const until = autoBlocked.get(ip);
  if (!until) return false;
  if (until <= now()) {
    autoBlocked.delete(ip);
    return false;
  }
  return true;
};

/**
 * Call after any failed authentication event (wrong password, wrong OTP,
 * etc). Never throws.
 */
const registerIpFailure = async (ip, req) => {
  try {
    if (!ip) return;
    const windowMs = IP_FAILURE_WINDOW_MINUTES * 60 * 1000;
    const timestamps = (failureLog.get(ip) || []).filter((t) => t > now() - windowMs);
    timestamps.push(now());
    failureLog.set(ip, timestamps);

    if (timestamps.length >= IP_MAX_FAILURES && !isAutoBlocked(ip)) {
      const blockedUntil = now() + IP_BLOCK_MINUTES * 60 * 1000;
      autoBlocked.set(ip, blockedUntil);
      failureLog.delete(ip);

      await logEvent({
        action: "IP_AUTO_BLOCKED",
        req,
        details: `IP ${ip} auto-blocked for ${IP_BLOCK_MINUTES}m after ${timestamps.length} failed attempts in ${IP_FAILURE_WINDOW_MINUTES}m`,
      });

      await sendSecurityAlert(
        "VroomGo security alert: IP address auto-blocked",
        `IP address ${ip} was automatically blocked for ${IP_BLOCK_MINUTES} minutes after ${timestamps.length} failed authentication attempts within ${IP_FAILURE_WINDOW_MINUTES} minutes.`
      );
    }
  } catch (err) {
    console.error("registerIpFailure error:", err.message);
  }
};

/** Call after a successful authentication to clear that IP's failure count. */
const registerIpSuccess = (ip) => {
  if (ip) failureLog.delete(ip);
};

// Cache the (usually tiny) manual block/allow list in memory for a few
// seconds so the common case (no rule for this IP) doesn't cost a DB query
// on every single request.
let manualCache = { allow: new Set(), block: new Set(), loadedAt: 0 };
const CACHE_TTL_MS = 5000;

const loadManualList = async () => {
  if (now() - manualCache.loadedAt < CACHE_TTL_MS) return manualCache;

  const entries = await IpAccessModel.find({
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();

  const allow = new Set(entries.filter((e) => e.type === "allow").map((e) => e.ip));
  const block = new Set(entries.filter((e) => e.type === "block").map((e) => e.ip));

  manualCache = { allow, block, loadedAt: now() };
  return manualCache;
};

/** Call after any admin create/update/delete of an IpAccess rule. */
const invalidateManualCache = () => {
  manualCache.loadedAt = 0;
};

/**
 * Global Express middleware. Runs before rate limiters and before every
 * route, so a blocked IP is rejected as cheaply as possible.
 */
const ipGate = async (req, res, next) => {
  try {
    const ip = req.ip;
    const { allow, block } = await loadManualList();

    if (allow.has(ip)) return next();

    if (block.has(ip)) {
      return res.status(403).json({
        success: false,
        message: "Access from this IP address has been blocked by an administrator.",
      });
    }

    if (isAutoBlocked(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts from this IP address. Please try again later.",
      });
    }

    return next();
  } catch (err) {
    // A failure in the access-control layer must never take the whole API down.
    console.error("ipGate error:", err.message);
    return next();
  }
};

module.exports = {
  ipGate,
  registerIpFailure,
  registerIpSuccess,
  invalidateManualCache,
};
