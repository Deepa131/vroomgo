const { Router } = require("express");
const { uploadImage, uploadVideo } = require("../middleware/upload.middleware");
const { authorizedMiddleware } = require("../middleware/auth.middleware");
const vehicleController = require("../controllers/vehicle.controller");

const router = Router();

router.post(
  "/upload-image",
  authorizedMiddleware,
  uploadImage.single("images"),
  vehicleController.uploadVehicleImage
);

router.post(
  "/upload-video",
  authorizedMiddleware,
  uploadVideo.single("videos"),
  vehicleController.uploadVehicleVideo
);

router.post("/", authorizedMiddleware, vehicleController.createVehicle);
router.get("/", vehicleController.getAllVehicles);
router.get("/:id", vehicleController.getVehicleById);
router.get("/vendor/:vendorId", vehicleController.getVehiclesByVendor);
router.put("/:id", authorizedMiddleware, vehicleController.updateVehicle);
router.delete("/:id", authorizedMiddleware, vehicleController.deleteVehicle);

module.exports = router;
