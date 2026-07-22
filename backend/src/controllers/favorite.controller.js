const { FavoriteModel } = require("../models/favorite.model");
const { VehicleModel } = require("../models/vehicle.model");

const addFavorite = async (req, res) => {
  try {
    const { vehicleId } = req.body;
    const customerId = req.user._id.toString();

    if (!vehicleId) return res.status(400).json({ success: false, message: "vehicleId is required" });

    const existing = await FavoriteModel.findOne({ customerId, vehicleId });
    if (existing) {
      return res.status(200).json({ success: true, message: "Already in favorites", data: existing });
    }

    const favorite = await FavoriteModel.create({ customerId, vehicleId });
    return res.status(201).json({ success: true, message: "Added to favorites", data: favorite });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to add favorite" });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const customerId = req.user._id.toString();

    await FavoriteModel.findOneAndDelete({ customerId, vehicleId });
    return res.status(200).json({ success: true, message: "Removed from favorites" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to remove favorite" });
  }
};

const getMyFavorites = async (req, res) => {
  try {
    const customerId = req.user._id.toString();
    const favorites = await FavoriteModel.find({ customerId }).sort({ createdAt: -1 });

    const vehicles = await Promise.all(
      favorites.map(async (fav) => {
        const vehicle = await VehicleModel.findById(fav.vehicleId)
          .populate("vendorId", "fullName email phone")
          .populate("category", "typeName");
        return vehicle;
      })
    );

    return res.status(200).json({ success: true, data: vehicles.filter(Boolean) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch favorites" });
  }
};

module.exports = { addFavorite, removeFavorite, getMyFavorites };
