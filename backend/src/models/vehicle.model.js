const mongoose = require("mongoose");
const { Schema } = mongoose;

const VehicleSchema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor ID is required"],
    },
    vendorContactNumber: {
      type: String,
      required: [true, "Vendor contact number is required"],
      trim: true,
    },
    vehicleName: {
      type: String,
      required: [true, "Vehicle name is required"],
      trim: true,
    },
    brand: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" },
    year: { type: Number },
    dailyRate: {
      type: Number,
      required: [true, "Daily rate is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    locationCoords: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String, trim: true },
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "VehicleCategory",
      required: [true, "Vehicle category is required"],
    },
    transmission: {
      type: String,
      enum: ["automatic", "manual"],
      default: "automatic",
    },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "electric", "hybrid"],
      default: "petrol",
    },
    seatingCapacity: { type: Number, default: 4 },
    licensePlate: { type: String, trim: true, default: "" },
    features: [{ type: String, trim: true }],
    description: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    videos: [{ type: String, trim: true }],
    isAvailable: { type: Boolean, default: true },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "archived"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const VehicleModel = mongoose.model("Vehicle", VehicleSchema);

module.exports = { VehicleModel };
