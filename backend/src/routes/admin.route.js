const { Router } = require("express");
const adminController = require("../controllers/admin.controller");
const { authorizedMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { uploadImage } = require("../middleware/upload.middleware");
const vehicleController = require("../controllers/vehicle.controller");

const router = Router();

router.post(
  "/users",
  authorizedMiddleware,
  adminMiddleware,
  uploadImage.single("profilePicture"),
  adminController.createUser
);
router.get("/users", authorizedMiddleware, adminMiddleware, adminController.getAllUsers);
router.get("/users/:id", authorizedMiddleware, adminMiddleware, adminController.getUserById);
router.put(
  "/users/:id",
  authorizedMiddleware,
  adminMiddleware,
  uploadImage.single("profilePicture"),
  adminController.updateUser
);
router.delete("/users/:id", authorizedMiddleware, adminMiddleware, adminController.deleteUser);

router.get("/stats", authorizedMiddleware, adminMiddleware, adminController.getStats);
router.get("/audit-logs", authorizedMiddleware, adminMiddleware, adminController.getAuditLogs);

router.get("/vehicles", authorizedMiddleware, adminMiddleware, vehicleController.adminGetAllVehicles);
router.put("/vehicles/:id/status", authorizedMiddleware, adminMiddleware, vehicleController.adminUpdateVehicleStatus);
router.delete("/vehicles/:id", authorizedMiddleware, adminMiddleware, vehicleController.adminDeleteVehicle);

// IP-based blocking / allow-listing (manual, admin-managed rules - see
// utils/ipAccessControl.js for the automatic sliding-window layer).
router.get("/ip-access", authorizedMiddleware, adminMiddleware, adminController.listIpAccess);
router.post("/ip-access", authorizedMiddleware, adminMiddleware, adminController.upsertIpAccess);
router.delete("/ip-access/:id", authorizedMiddleware, adminMiddleware, adminController.deleteIpAccess);

// Real-time security monitoring: a live Server-Sent-Events feed of
// high-severity security events (account lockouts, IP auto-blocks,
// session/device mismatches, manual IP rule changes).
router.get("/alerts/stream", authorizedMiddleware, adminMiddleware, adminController.streamAlerts);

module.exports = router;
