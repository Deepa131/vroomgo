require("dotenv").config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5080;

const NODE_ENV = process.env.NODE_ENV || "development";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/vroomgo";

const JWT_SECRET = process.env.JWT_SECRET || "vroomgo_super_secret_change_me";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "30d";

// Short-lived token used only to carry "I passed step 1 (password)" state
// between /login and /verify-otp. Deliberately NOT the same secret as the
// real access-token secret, and deliberately short-lived (see auth.controller.js).
const OTP_TOKEN_SECRET = process.env.OTP_TOKEN_SECRET || "vroomgo_otp_secret_change_me";
const OTP_TOKEN_EXPIRE = process.env.OTP_TOKEN_EXPIRE || "5m";
const OTP_EXPIRE_MINUTES = process.env.OTP_EXPIRE_MINUTES
  ? parseInt(process.env.OTP_EXPIRE_MINUTES, 10)
  : 5;
const OTP_MAX_ATTEMPTS = process.env.OTP_MAX_ATTEMPTS
  ? parseInt(process.env.OTP_MAX_ATTEMPTS, 10)
  : 5;

// This MUST exactly match the scheme+host+port the browser shows in its
// address bar for the frontend (protocol, host, and port all count for
// CORS). The frontend's Vite dev server (frontend/vite.config.js) now runs
// plain HTTP on port 5000, so the default here is "http://localhost:5000".
// If you switch the frontend back to HTTPS (re-add basicSsl in
// vite.config.js), update this default - and your .env, if you set one -
// to "https://localhost:5000" to match, or CORS will reject every request
// and the frontend will show "Could not load captcha."
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5000";

const RESET_PASSWORD_URL = process.env.RESET_PASSWORD_URL || "";

const RESET_PASSWORD_EXPIRE_MINUTES = process.env.RESET_PASSWORD_EXPIRE_MINUTES
  ? parseInt(process.env.RESET_PASSWORD_EXPIRE_MINUTES, 10)
  : 60;

// Comma separated list of origins allowed to call this API with credentials.
// e.g. "http://localhost:5000,https://vroomgo.example.com"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || FRONTEND_URL)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Secret used to sign the cookie that holds the CSRF secret (double-submit pattern)
const COOKIE_SECRET = process.env.COOKIE_SECRET || "vroomgo_cookie_secret_change_me";

// Name of the httpOnly cookie that carries the real access JWT.
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";

// 64-char hex (32 byte) key used for AES-256-GCM encryption of the phone field.
const PHONE_ENC_KEY = (process.env.PHONE_ENC_KEY || "").trim();

// Password reuse / expiry policy
const PASSWORD_HISTORY_LIMIT = process.env.PASSWORD_HISTORY_LIMIT
  ? parseInt(process.env.PASSWORD_HISTORY_LIMIT, 10)
  : 5;
const PASSWORD_EXPIRY_DAYS = process.env.PASSWORD_EXPIRY_DAYS
  ? parseInt(process.env.PASSWORD_EXPIRY_DAYS, 10)
  : 90;

// Account lockout (brute-force defense)
const MAX_LOGIN_ATTEMPTS = process.env.MAX_LOGIN_ATTEMPTS
  ? parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10)
  : 5;
const LOCK_TIME_MINUTES = process.env.LOCK_TIME_MINUTES
  ? parseInt(process.env.LOCK_TIME_MINUTES, 10)
  : 15;

// HTTPS (used only when we terminate TLS inside Node itself for local/dev demo -
// see server.js for the production note about reverse-proxy TLS termination)
const USE_HTTPS = process.env.USE_HTTPS === "true";
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || "./certs/key.pem";
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || "./certs/cert.pem";

// Self-hosted image CAPTCHA (see utils/captcha.js). Signed separately from
// every other token so a captcha token can never be replayed as auth.
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || "vroomgo_captcha_secret_change_me";
const CAPTCHA_EXPIRE_MINUTES = process.env.CAPTCHA_EXPIRE_MINUTES
  ? parseInt(process.env.CAPTCHA_EXPIRE_MINUTES, 10)
  : 5;

// Pepper used to bind a session's JWT to the User-Agent string that created
// it (see utils/deviceBinding.js). Kept separate from JWT_SECRET so this
// value can be rotated independently.
const UA_BINDING_SECRET = process.env.UA_BINDING_SECRET || "vroomgo_ua_binding_secret_change_me";

// Passwordless "magic link" login (see auth.controller.js magic-link handlers)
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || "vroomgo_magic_link_secret_change_me";
const MAGIC_LINK_EXPIRE_MINUTES = process.env.MAGIC_LINK_EXPIRE_MINUTES
  ? parseInt(process.env.MAGIC_LINK_EXPIRE_MINUTES, 10)
  : 15;

// System-wide IP-level brute-force defense (independent of per-account
// lockout): after IP_MAX_FAILURES failed logins/OTP attempts from the same
// IP inside IP_FAILURE_WINDOW_MINUTES, that IP is auto-blocked for
// IP_BLOCK_MINUTES. Admins can also manually block/allow specific IPs.
const IP_MAX_FAILURES = process.env.IP_MAX_FAILURES
  ? parseInt(process.env.IP_MAX_FAILURES, 10)
  : 20;
const IP_FAILURE_WINDOW_MINUTES = process.env.IP_FAILURE_WINDOW_MINUTES
  ? parseInt(process.env.IP_FAILURE_WINDOW_MINUTES, 10)
  : 15;
const IP_BLOCK_MINUTES = process.env.IP_BLOCK_MINUTES
  ? parseInt(process.env.IP_BLOCK_MINUTES, 10)
  : 60;

// Mailbox that receives real-time security alerts (account lockouts, IP
// auto-blocks, device-mismatch events, etc). Falls back to EMAIL_USER (the
// same mailbox the app already sends from) if not set.
const ALERT_EMAIL = process.env.ALERT_EMAIL || process.env.EMAIL_USER || "";

// Google OAuth login - the OAuth2 client ID used to verify Google Identity
// Services ID tokens server-side (see controllers/auth.controller.js googleLogin).
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

module.exports = {
  PORT,
  NODE_ENV,
  MONGODB_URI,
  JWT_SECRET,
  JWT_EXPIRE,
  OTP_TOKEN_SECRET,
  OTP_TOKEN_EXPIRE,
  OTP_EXPIRE_MINUTES,
  OTP_MAX_ATTEMPTS,
  FRONTEND_URL,
  RESET_PASSWORD_URL,
  RESET_PASSWORD_EXPIRE_MINUTES,
  ALLOWED_ORIGINS,
  COOKIE_SECRET,
  USE_HTTPS,
  HTTPS_KEY_PATH,
  HTTPS_CERT_PATH,
  AUTH_COOKIE_NAME,
  PHONE_ENC_KEY,
  PASSWORD_HISTORY_LIMIT,
  PASSWORD_EXPIRY_DAYS,
  MAX_LOGIN_ATTEMPTS,
  LOCK_TIME_MINUTES,
  CAPTCHA_SECRET,
  CAPTCHA_EXPIRE_MINUTES,
  UA_BINDING_SECRET,
  MAGIC_LINK_SECRET,
  MAGIC_LINK_EXPIRE_MINUTES,
  IP_MAX_FAILURES,
  IP_FAILURE_WINDOW_MINUTES,
  IP_BLOCK_MINUTES,
  ALERT_EMAIL,
  GOOGLE_CLIENT_ID,
};