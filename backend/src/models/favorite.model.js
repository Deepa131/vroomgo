const mongoose = require("mongoose");
const { Schema } = mongoose;

const FavoriteSchema = new Schema(
  {
    customerId: { type: String, required: true },
    vehicleId: { type: String, required: true },
  },
  { timestamps: true }
);

FavoriteSchema.index({ customerId: 1, vehicleId: 1 }, { unique: true });

const FavoriteModel = mongoose.model("Favorite", FavoriteSchema);

module.exports = { FavoriteModel };
