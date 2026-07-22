const { Router } = require("express");
const favoriteController = require("../controllers/favorite.controller");
const { authorizedMiddleware } = require("../middleware/auth.middleware");

const router = Router();

router.post("/", authorizedMiddleware, favoriteController.addFavorite);
router.get("/", authorizedMiddleware, favoriteController.getMyFavorites);
router.delete("/:vehicleId", authorizedMiddleware, favoriteController.removeFavorite);

module.exports = router;
