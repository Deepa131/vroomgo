const csurf = require("csurf");
const { NODE_ENV } = require("../config");

/**
 * ---------------------------------------------------------------------------
 * CSRF (Cross-Site Request Forgery) PROTECTION
 * ---------------------------------------------------------------------------
 * WHAT IS CSRF:
 *   A malicious site tricks a victim's browser into firing a request at OUR
 *   API while the victim is logged in - e.g. an <img> or auto-submitting
 *   <form> on evil.com that POSTs to https://vroomgo.api/bookings. The
 *   browser automatically attaches cookies for our domain, so if we
 *   authenticated purely via a cookie, that forged request would look
 *   "logged in" to our server even though the real user never clicked
 *   anything on our site.
 *
 * IMPORTANT NUANCE FOR THIS APP :
 *   VroomGo authenticates API calls with a JWT sent in the
 *   `Authorization: Bearer <token>` HEADER (see src/api/axios.js on the
 *   frontend), not with a session cookie. Browsers do NOT automatically
 *   attach arbitrary headers to cross-site requests the way they do with
 *   cookies, so a forged cross-site request from evil.com cannot forge that
 *   Authorization header. This means the *main* auth mechanism is already
 *   inherently resistant to classic CSRF.
 *
 *   However: (1) the assignment explicitly requires CSRF middleware to be
 *   demonstrated, and (2) as soon as ANY part of the app uses a cookie for
 *   anything session-like, that part becomes CSRF-exposed again. So we add
 *   a standard, textbook "double-submit cookie" CSRF layer on top, applied
 *   to every state-changing (POST/PUT/PATCH/DELETE) request regardless of
 *   how auth works, as defense-in-depth.
 *
 * HOW THE DOUBLE-SUBMIT COOKIE PATTERN WORKS:
 *   1. Client calls GET /api/csrf-token. The server (via csurf) sets a
 *      secret in an httpOnly cookie AND returns a matching CSRF token in the
 *      JSON response body.
 *   2. The frontend stores that token in memory and attaches it as an
 *      `X-CSRF-Token` header on every subsequent mutating request.
 *   3. On each mutating request, csurf checks that the token in the header
 *      matches the secret in the cookie. A cross-site attacker can trigger
 *      the browser to SEND the cookie automatically, but they cannot READ
 *      the token to put it in the header (same-origin policy blocks that),
 *      so a forged request fails this check.
 */
const csrfProtection = csurf({
  cookie: {
    key: "_csrf",
    httpOnly: true,
    sameSite: "strict",
    secure: NODE_ENV === "production", // cookie only sent over HTTPS in production
  },
});

// GET /api/csrf-token - public endpoint, no auth required. Frontend calls
// this once on load (and again if a CSRF check ever fails) to obtain a token.
const issueCsrfToken = [
  csrfProtection,
  (req, res) => {
    res.status(200).json({ success: true, csrfToken: req.csrfToken() });
  },
];

// Friendly error handler so a failed CSRF check returns clean JSON instead
// of an HTML stack trace / generic 500.
const csrfErrorHandler = (err, req, res, next) => {
  if (err && err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      success: false,
      message: "Invalid or missing CSRF token. Please refresh and try again.",
    });
  }
  return next(err);
};

module.exports = { csrfProtection, issueCsrfToken, csrfErrorHandler };