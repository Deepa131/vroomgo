const { VehicleCategoryModel } = require("../models/vehicleCategory.model");

const createCategory = async (req, res) => {
  try {
    const { typeName, status } = req.body;
    if (!typeName || typeof typeName !== "string") {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const category = await VehicleCategoryModel.create({
      typeName: typeName.trim(),
      status: status ?? "active",
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: "Category name already exists" });
    }
    return res.status(500).json({ success: false, message: error.message || "Failed to create category" });
  }
};

const getAllCategories = async (_req, res) => {
  try {
    const categories = await VehicleCategoryModel.find();
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch categories" });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await VehicleCategoryModel.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Invalid category ID" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { typeName, status } = req.body;
    const category = await VehicleCategoryModel.findByIdAndUpdate(
      req.params.id,
      { ...(typeName && { typeName }), ...(status && { status }) },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update category" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await VehicleCategoryModel.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    await category.deleteOne();
    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to delete category" });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
