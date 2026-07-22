const crypto = require("crypto");
const { UA_BINDING_SECRET } = require("../config");

/**
 * -----------------------------------------------------------------------
 * Session binding to User-Agent (device binding)
 * -----------------------------------------------------------------------
 * WHAT: at login, a hash of the browser's User-Agent string is embedded as
 *       a claim inside the JWT stored in the httpOnly auth cookie. On every
 *       authenticated request, the server recomputes the hash of the
 *       *current* request's User-Agent and rejects the session if it does
 *       not match what was embedded at login time.
 * WHY:  if a session cookie/JWT is ever stolen (e.g. leaked logs, a
 *       misconfigured proxy, physical device access), replaying it from a
 *       different browser/device is rejected outright, shrinking the
 *       window in which a stolen token is useful.
 * LIMITATION: the User-Agent header is client-supplied and can be spoofed
 *       by a sufficiently motivated attacker who copies it verbatim
 *       alongside the stolen cookie - this is a "raise the bar" control,
 *       not a cryptographic guarantee, which is why it is layered on top
 *       of (not a replacement for) short JWT expiry, httpOnly/secure/
 *       sameSite cookies and CSRF protection.
 */
const hashUserAgent = (userAgent) =>
  crypto
    .createHmac("sha256", UA_BINDING_SECRET)
    .update(userAgent || "unknown")
    .digest("hex");

module.exports = { hashUserAgent };
