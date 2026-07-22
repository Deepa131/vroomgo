const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const svgCaptcha = require("svg-captcha");
const { CAPTCHA_SECRET, CAPTCHA_EXPIRE_MINUTES } = require("../config");

/**
 * -----------------------------------------------------------------------
 * Self-hosted CAPTCHA (bot / automated brute-force defense)
 * -----------------------------------------------------------------------
 * WHY SELF-HOSTED INSTEAD OF reCAPTCHA/hCaptcha: those require calling out
 * to a third-party verification API and shipping a third-party script to
 * every visitor (a supply-chain / privacy trade-off). A self-hosted image
 * captcha keeps verification entirely inside this app and needs no
 * external network call, while still forcing an attacker to solve an
 * image challenge instead of scripting requests directly at the API.
 *
 * DESIGN: the server never has to remember which captcha it issued
 * (no session store / DB table needed). Instead the correct answer is
 * hashed and the hash is embedded in a short-lived, server-signed JWT
 * ("captchaId") that is handed back to the client alongside the SVG. The
 * client returns both the captchaId and the text the user typed; the
 * server just re-hashes the typed answer and compares it to the hash
 * inside the (verified, not-yet-expired) token.
 *
 * TRADE-OFF: because this is stateless, a captchaId is technically valid
 * (replayable) until it expires (default 5 minutes) rather than strictly
 * single-use. This is an accepted trade-off for this assignment - the
 * short expiry plus the fact that it is only ever one layer alongside
 * rate limiting, account lockout and IP-level blocking keeps the residual
 * risk low. A production system with Redis available could easily upgrade
 * this to single-use by recording consumed captchaIds.
 */

const hashAnswer = (text) =>
  crypto.createHash("sha256").update(String(text).toLowerCase().trim()).digest("hex");

const generateCaptcha = () => {
  const captcha = svgCaptcha.create({
    size: 5,
    noise: 3,
    color: true,
    width: 160,
    height: 60,
    background: "#0b1220",
    ignoreChars: "0oO1ilI",
  });

  const captchaId = jwt.sign({ answerHash: hashAnswer(captcha.text) }, CAPTCHA_SECRET, {
    expiresIn: `${CAPTCHA_EXPIRE_MINUTES}m`,
  });

  return { captchaId, svg: captcha.data };
};

const verifyCaptcha = (captchaId, answer) => {
  if (!captchaId || !answer) {
    return { ok: false, reason: "Please solve the captcha." };
  }

  let decoded;
  try {
    decoded = jwt.verify(captchaId, CAPTCHA_SECRET);
  } catch (err) {
    return { ok: false, reason: "Captcha has expired, please try a new one." };
  }

  if (!decoded || decoded.answerHash !== hashAnswer(answer)) {
    return { ok: false, reason: "Incorrect captcha, please try again." };
  }

  return { ok: true };
};

module.exports = { generateCaptcha, verifyCaptcha };
