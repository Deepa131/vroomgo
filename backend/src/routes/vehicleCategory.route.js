const { Router } = require("express");
const categoryController = require("../controllers/vehicleCategory.controller");
const { adminMiddleware, authorizedMiddleware } = require("../middleware/auth.middleware");

const router = Router();

router.get("/", categoryController.getAllCategories);
router.post("/", authorizedMiddleware, adminMiddleware, categoryController.createCategory);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", authorizedMiddleware, adminMiddleware, categoryController.updateCategory);
router.delete("/:id", authorizedMiddleware, adminMiddleware, categoryController.deleteCategory);

module.exports = router;
