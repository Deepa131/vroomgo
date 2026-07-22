const mongoose = require("mongoose");
const { MONGODB_URI } = require("../config");
const { VehicleCategoryModel } = require("../models/vehicleCategory.model");

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    await seedVehicleCategories();
  } catch (error) {
    console.error("Database Error:", error);
    process.exit(1);
  }
}

async function seedVehicleCategories() {
  try {
    const count = await VehicleCategoryModel.countDocuments();

    if (count === 0) {
      const defaultCategories = [
        { typeName: "Sedan", status: "active" },
        { typeName: "SUV", status: "active" },
        { typeName: "Hatchback", status: "active" },
        { typeName: "Van", status: "active" },
        { typeName: "Pickup Truck", status: "active" },
        { typeName: "Motorbike", status: "active" },
        { typeName: "Luxury", status: "active" },
        { typeName: "Electric", status: "active" },
      ];

      await VehicleCategoryModel.insertMany(defaultCategories);
      console.log("Default vehicle categories seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding vehicle categories:", error);
  }
}

module.exports = { connectDatabase };
