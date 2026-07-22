const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const { COOKIE_SECRET, ALLOWED_ORIGINS } = require("./config");
const {
  helmetMiddleware,
  apiLimiter,
  loginLimiter,
  otpLimiter,
  forgotPasswordLimiter,
  registerLimiter,
  magicLinkLimiter,
  sanitizeMongo,
  sanitizeXss,
} = require("./middleware/security.middleware");
const { issueCsrfToken, csrfProtection, csrfErrorHandler } = require("./middleware/csrf.middleware");
const { ipGate } = require("./utils/ipAccessControl");

const authRoutes = require("./routes/auth.route");
const adminRoutes = require("./routes/admin.route");
const vehicleRoutes = require("./routes/vehicle.route");
const vehicleCategoryRoutes = require("./routes/vehicleCategory.route");
const bookingRoutes = require("./routes/booking.route");
const favoriteRoutes = require("./routes/favorite.route");

const app = express();

// Behind a reverse proxy (Nginx/Heroku/Render/etc.) this lets Express read
// the real client IP/protocol from X-Forwarded-* headers - needed for
// rate-limiting and for secure cookies to behave correctly behind TLS-terminating proxies.
app.set("trust proxy", 1);

/**
 * -----------------------------------------------------------------------
 * CORS - restricted to a known allowlist (instead of "reflect any origin")
 * -----------------------------------------------------------------------
 * WHAT:  Controls which *browser-based* origins are allowed to read the
 *        response of a cross-origin request (via the
 *        Access-Control-Allow-Origin header).
 * WHY:   The original code did `origin: (origin, cb) => cb(null, true)`,
 *        which reflects and allows EVERY origin - combined with
 *        `credentials: true` that is a serious misconfiguration: it tells
 *        browsers "any website may make credentialed requests to this API
 *        and read the response", which defeats same-origin protections for
 *        any user who's logged in and visits a malicious page.
 * HOW:   We only allow origins explicitly listed in ALLOWED_ORIGINS (see
 *        .env). Requests with no Origin header (e.g. curl, mobile apps,
 *        server-to-server) are allowed through since the Origin check only
 *        matters for browsers.
 */
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  optionsSuccessStatus: 200,
  credentials: true, // required so the browser sends/receives the CSRF cookie
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
};

app.use(cors(corsOptions));

// System-wide IP block/allow list (see utils/ipAccessControl.js). Runs
// before everything else so a blocked IP is rejected as cheaply as
// possible, independently of the per-account lockout and per-route rate
// limiters below.
app.use(ipGate);

// Security response headers + CSP (see security.middleware.js for the "why")
app.use(helmetMiddleware);

app.use("/public", express.static(path.join(__dirname, "../public")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));

// Strip Mongo operator injection ($gt, $where, ".") and then strip HTML/script
// payloads out of every string field, for every request from here on.
app.use(sanitizeMongo);
app.use(sanitizeXss);

// A gentle global rate limit for the whole API...
app.use("/api", apiLimiter);
// ...and tighter limits for the specific endpoints attackers actually target.
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/verify-otp", otpLimiter);
app.use("/api/auth/resend-otp", otpLimiter);
app.use("/api/auth/forgot-password", forgotPasswordLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api/auth/magic-link/request", magicLinkLimiter);

// Public endpoint the frontend calls once on load to get a CSRF token before
// it can make any POST/PUT/DELETE request (see csrf.middleware.js).
app.get("/api/csrf-token", ...issueCsrfToken);

// Every state-changing request from here on must carry a valid X-CSRF-Token
// header matching the _csrf cookie (double-submit pattern).
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  return csrfProtection(req, res, next);
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/vehicle-categories", vehicleCategoryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/favorites", favoriteRoutes);

app.get("/", (req, res) => {
  return res.status(200).json({ success: true, message: "Welcome to the VroomGo API" });
});

// CSRF failures get a clean JSON 403 instead of falling through to the generic handler
app.use(csrfErrorHandler);

app.use((err, req, res, next) => {
  if (err && typeof err.message === "string" && err.message.startsWith("CORS:")) {
    return res.status(403).json({ success: false, message: "This origin is not permitted to access the API" });
  }
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;