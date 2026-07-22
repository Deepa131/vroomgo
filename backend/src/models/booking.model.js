const mongoose = require("mongoose");
const { Schema } = mongoose;

const BookingSchema = new Schema(
  {
    vehicleId: { type: String, required: true },
    vendorId: { type: String, required: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    pickupTime: { type: String, required: true },
    pickupLocation: { type: String, default: "" },
    message: { type: String, default: "" },
    totalDays: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "active", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const BookingModel = mongoose.model("Booking", BookingSchema);

module.exports = { BookingModel };
