const path = require("path");
const fs = require("fs");
const { VehicleModel } = require("../models/vehicle.model");
const { VehicleCategoryModel } = require("../models/vehicleCategory.model");
const { assertSafeMediaList } = require("../utils/urlSafety");

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

const createVehicle = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const {
      vendorContactNumber,
      vehicleName,
      brand,
      model,
      year,
      dailyRate,
      location,
      locationCoords,
      category,
      transmission,
      fuelType,
      seatingCapacity,
      licensePlate,
      features,
      description,
      images,
      videos,
    } = req.body;

    const vendorId = req.user._id;

    if (!vehicleName || !dailyRate || !location || !category) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: vehicleName, dailyRate, location, category",
      });
    }

    let categoryId = category;
    if (!isValidObjectId(category)) {
      const found = await VehicleCategoryModel.findOne({ typeName: category });
      if (!found) {
        return res.status(400).json({ success: false, message: `Vehicle category "${category}" not found` });
      }
      categoryId = found._id;
    }

    // SSRF guard: images/videos can be either our own uploaded file paths or
    // an external URL supplied directly in the JSON body. Reject anything
    // pointing at a private/internal/loopback address before it's ever
    // saved - see utils/urlSafety.js for the full rationale.
    try {
      await assertSafeMediaList(images);
      await assertSafeMediaList(videos);
    } catch (e) {
      return res.status(400).json({ success: false, message: `Invalid media URL: ${e.message}` });
    }

    const vehicle = await VehicleModel.create({
      vendorId,
      vendorContactNumber,
      vehicleName,
      brand,
      model,
      year,
      dailyRate,
      location,
      locationCoords,
      category: categoryId,
      transmission,
      fuelType,
      seatingCapacity,
      licensePlate,
      features,
      description,
      images,
      videos,
    });

    return res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const getAllVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.vendorId) filter.vendorId = req.query.vendorId;
    if (req.query.isAvailable !== undefined) filter.isAvailable = req.query.isAvailable === "true";
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.transmission) filter.transmission = req.query.transmission;
    if (req.query.fuelType) filter.fuelType = req.query.fuelType;
    if (req.query.minPrice || req.query.maxPrice) {
      filter.dailyRate = {};
      if (req.query.minPrice) filter.dailyRate.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.dailyRate.$lte = Number(req.query.maxPrice);
    }
    if (req.query.searchText) {
      filter.$or = [
        { vehicleName: { $regex: req.query.searchText, $options: "i" } },
        { brand: { $regex: req.query.searchText, $options: "i" } },
        { location: { $regex: req.query.searchText, $options: "i" } },
      ];
    }

    // Public browsing should default to approved + available unless explicitly overridden
    if (!req.query.approvalStatus && !req.query.vendorId) {
      filter.approvalStatus = "approved";
    }

    const total = await VehicleModel.countDocuments(filter);
    const vehicles = await VehicleModel.find(filter)
      .populate("vendorId", "fullName email phone")
      .populate("category", "typeName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: vehicles,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const getVehicleById = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(req.params.id)
      .populate("vendorId", "fullName email phone")
      .populate("category", "typeName");

    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    return res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const getVehiclesByVendor = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({ vendorId: req.params.vendorId })
      .populate("vendorId", "fullName email phone")
      .populate("category", "typeName")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const updateVehicle = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const vehicle = await VehicleModel.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    if (vehicle.vendorId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to update this vehicle" });
    }

    const updateFields = { ...req.body };
    // Any edit by a non-admin resets approval status back to pending
    if (req.user.role !== "admin") {
      updateFields.approvalStatus = "pending";
    }

    if (updateFields.images || updateFields.videos) {
      try {
        await assertSafeMediaList(updateFields.images);
        await assertSafeMediaList(updateFields.videos);
      } catch (e) {
        return res.status(400).json({ success: false, message: `Invalid media URL: ${e.message}` });
      }
    }

    Object.assign(vehicle, updateFields);
    await vehicle.save();

    return res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const vehicle = await VehicleModel.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    if (vehicle.vendorId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this vehicle" });
    }

    const mediaPaths = [...(vehicle.images || []), ...(vehicle.videos || [])];
    mediaPaths.forEach((file) => {
      const fullPath = path.join(__dirname, "../../public/vehicle_images", file);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    await VehicleModel.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const uploadVehicleImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Please upload an image file" });
    // Must match the "/public/" prefix that assertSafeMediaList (utils/urlSafety.js)
    // treats as an already-trusted, server-owned path - a bare filename fails
    // that check and gets rejected as an invalid external URL on save.
    return res.status(200).json({
      success: true,
      data: `/public/vehicle_images/${req.file.filename}`,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const uploadVehicleVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Please upload a video file" });
    return res.status(200).json({
      success: true,
      data: `/public/vehicle_videos/${req.file.filename}`,
      message: "Video uploaded successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// Admin
const adminGetAllVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    if (req.query.isAvailable !== undefined) filter.isAvailable = req.query.isAvailable === "true";
    if (req.query.searchText) {
      filter.$or = [
        { vehicleName: { $regex: req.query.searchText, $options: "i" } },
        { location: { $regex: req.query.searchText, $options: "i" } },
      ];
    }

    const total = await VehicleModel.countDocuments(filter);
    const vehicles = await VehicleModel.find(filter)
      .populate("vendorId", "fullName email")
      .populate("category", "typeName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: vehicles,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const adminUpdateVehicleStatus = async (req, res) => {
  try {
    const { approvalStatus } = req.body;

    if (!["approved", "rejected", "archived"].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval status. Must be 'approved', 'rejected', or 'archived'",
      });
    }

    const vehicle = await VehicleModel.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    vehicle.approvalStatus = approvalStatus;
    await vehicle.save();

    return res.status(200).json({ success: true, data: vehicle, message: `Vehicle status updated to ${approvalStatus}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

const adminDeleteVehicle = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const mediaPaths = [...(vehicle.images || []), ...(vehicle.videos || [])];
    mediaPaths.forEach((file) => {
      const fullPath = path.join(__dirname, "../../public/vehicle_images", file);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    await VehicleModel.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: "Vehicle deleted successfully by admin" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

module.exports = {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  getVehiclesByVendor,
  updateVehicle,
  deleteVehicle,
  uploadVehicleImage,
  uploadVehicleVideo,
  adminGetAllVehicles,
  adminUpdateVehicleStatus,
  adminDeleteVehicle,
};