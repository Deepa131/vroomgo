const { BookingModel } = require("../models/booking.model");
const { VehicleModel } = require("../models/vehicle.model");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const createBooking = async (req, res) => {
  try {
    const {
      vehicleId,
      vendorId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      pickupDate,
      returnDate,
      pickupTime,
      pickupLocation,
      message,
    } = req.body;

    if (
      !vehicleId ||
      !vendorId ||
      !customerId ||
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !pickupDate ||
      !returnDate ||
      !pickupTime
    ) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const start = new Date(pickupDate);
    const end = new Date(returnDate);

    if (end <= start) {
      return res.status(400).json({ success: false, message: "Return date must be after pickup date" });
    }

    // Prevent overlapping active bookings for the same vehicle
    const overlapping = await BookingModel.findOne({
      vehicleId,
      status: { $in: ["pending", "confirmed", "active"] },
      pickupDate: { $lt: end },
      returnDate: { $gt: start },
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: "This vehicle is already booked for the selected dates. Please choose different dates.",
      });
    }

    const totalDays = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
    const totalPrice = totalDays * vehicle.dailyRate;

    const booking = await BookingModel.create({
      vehicleId,
      vendorId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      pickupDate: start,
      returnDate: end,
      pickupTime,
      pickupLocation: pickupLocation || vehicle.location,
      message: message || "",
      totalDays,
      totalPrice,
      status: "pending",
    });

    return res.status(201).json({ success: true, message: "Booking request submitted successfully", data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create booking" });
  }
};

const attachVehicleInfo = async (bookings) => {
  return Promise.all(
    bookings.map(async (booking) => {
      const vehicle = await VehicleModel.findById(booking.vehicleId).populate("category");
      return {
        ...booking.toJSON(),
        vehicle: vehicle
          ? {
              id: vehicle._id,
              vehicleName: vehicle.vehicleName,
              brand: vehicle.brand,
              model: vehicle.model,
              location: vehicle.location,
              dailyRate: vehicle.dailyRate,
              images: vehicle.images,
              category: vehicle.category,
            }
          : null,
      };
    })
  );
};

const getVendorBookings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status } = req.query;
    const filter = { vendorId };
    if (status) filter.status = status;

    const bookings = await BookingModel.find(filter).sort({ createdAt: -1 });
    const data = await attachVehicleInfo(bookings);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch bookings" });
  }
};

const getCustomerBookings = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { status } = req.query;
    const filter = { customerId };
    if (status) filter.status = status;

    const bookings = await BookingModel.find(filter).sort({ createdAt: -1 });
    const data = await attachVehicleInfo(bookings);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch bookings" });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch booking" });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "active", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const booking = await BookingModel.findByIdAndUpdate(bookingId, { status }, { new: true });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    return res.status(200).json({ success: true, message: "Booking status updated", data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update booking" });
  }
};

const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { pickupDate, returnDate, pickupTime, message } = req.body;

    if (!pickupDate || !returnDate || !pickupTime) {
      return res.status(400).json({ success: false, message: "Pickup date, return date and time are required" });
    }

    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (end <= start) {
      return res.status(400).json({ success: false, message: "Return date must be after pickup date" });
    }

    const existing = await BookingModel.findById(bookingId);
    if (!existing) return res.status(404).json({ success: false, message: "Booking not found" });

    const vehicle = await VehicleModel.findById(existing.vehicleId);
    const totalDays = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
    const totalPrice = vehicle ? totalDays * vehicle.dailyRate : existing.totalPrice;

    const booking = await BookingModel.findByIdAndUpdate(
      bookingId,
      {
        pickupDate: start,
        returnDate: end,
        pickupTime,
        message: message || "",
        totalDays,
        totalPrice,
      },
      { new: true }
    );

    return res.status(200).json({ success: true, message: "Booking updated successfully", data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update booking" });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingModel.findByIdAndDelete(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    return res.status(200).json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete booking" });
  }
};

module.exports = {
  createBooking,
  getVendorBookings,
  getCustomerBookings,
  getBookingById,
  updateBookingStatus,
  updateBooking,
  cancelBooking,
};
