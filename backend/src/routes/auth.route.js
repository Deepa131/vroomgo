const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { authorizedMiddleware } = require("../middleware/auth.middleware");
const { uploadImage } = require("../middleware/upload.middleware");
const { requireCaptcha } = require("../middleware/captcha.middleware");
const { generateCaptcha } = require("../utils/captcha");

const router = Router();

// Stateless - the server never has to remember which captcha it issued,
router.get("/captcha", (req, res) => {
  const { captchaId, svg } = generateCaptcha();
  return res.status(200).json({ success: true, captchaId, svg });
});

router.post("/register", requireCaptcha, authController.register);
router.post("/login", requireCaptcha, authController.login);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);
router.post("/forgot-password", requireCaptcha, authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);
router.get("/me", authorizedMiddleware, authController.getMe);
router.post("/logout", authController.logout);

// Passwordless "magic link" login (advanced/optional authentication).
router.post("/magic-link/request", requireCaptcha, authController.requestMagicLink);
router.post("/magic-link/verify", authController.verifyMagicLink);

// Profile data export / import (privacy-aligned data portability).
router.get("/profile/export", authorizedMiddleware, authController.exportProfile);
router.post("/profile/import", authorizedMiddleware, authController.importProfile);
router.put(
  "/profile-picture",
  authorizedMiddleware,
  uploadImage.single("profilePicture"),
  authController.updateProfilePicture
);
router.put(
  "/:id",
  authorizedMiddleware,
  uploadImage.single("profilePicture"),
  authController.updateUserProfile
);

module.exports = router;