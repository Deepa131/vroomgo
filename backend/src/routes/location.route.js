const { Router } = require("express");
const locationController = require("../controllers/location.controller");

const router = Router();

router.get("/reverse-geocode", locationController.reverseGeocode);
router.get("/geocode", locationController.geocodeAddress);

module.exports = router;