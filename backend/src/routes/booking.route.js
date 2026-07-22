const { Router } = require("express");
const bookingController = require("../controllers/booking.controller");
const { authorizedMiddleware } = require("../middleware/auth.middleware");

const router = Router();

router.post("/book", authorizedMiddleware, bookingController.createBooking);
router.get("/vendor/:vendorId", authorizedMiddleware, bookingController.getVendorBookings);
router.get("/customer/:customerId", authorizedMiddleware, bookingController.getCustomerBookings);
router.get("/:bookingId", authorizedMiddleware, bookingController.getBookingById);
router.put("/:bookingId/status", authorizedMiddleware, bookingController.updateBookingStatus);
router.put("/:bookingId", authorizedMiddleware, bookingController.updateBooking);
router.delete("/:bookingId", authorizedMiddleware, bookingController.cancelBooking);

module.exports = router;
