const { verifyCaptcha } = require("../utils/captcha");

/**
 * Guards an endpoint with the self-hosted captcha (see utils/captcha.js).
 * Expects `captchaId` and `captchaText` in the request body. Runs before
 * the route's rate limiter has a chance to matter much, since a bot that
 * can't solve the captcha never reaches the controller logic at all.
 */
const requireCaptcha = (req, res, next) => {
  const { captchaId, captchaText } = req.body || {};
  const result = verifyCaptcha(captchaId, captchaText);

  if (!result.ok) {
    return res.status(400).json({ success: false, message: result.reason });
  }

  return next();
};

module.exports = { requireCaptcha };
