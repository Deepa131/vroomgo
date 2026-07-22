const mongoose = require("mongoose");
const { Schema } = mongoose;

const VehicleCategorySchema = new Schema(
  {
    typeName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
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

const VehicleCategoryModel = mongoose.model(
  "VehicleCategory",
  VehicleCategorySchema
);

module.exports = { VehicleCategoryModel };
