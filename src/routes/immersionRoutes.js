const router = require("express").Router();
const {
  createImmersionCountry,
  listImmersionCountries,
  getImmersionCountryById,
  updateImmersionCountry,
  deleteImmersionCountry,
  webListImmersionCountries,
  webGetImmersionCountryByZoneAndName
} = require("../controller/immersionCountriesController.js");

const { ValidateToken } = require("../middleware/auth.js");

// Web - No token required
router.get("/web/list-by-zone", webListImmersionCountries);
router.get('/web/details-by-country', webGetImmersionCountryByZoneAndName);


// admin
router.post("/create", ValidateToken, createImmersionCountry);
router.get("/", ValidateToken, listImmersionCountries);
router.get("/:id", ValidateToken, getImmersionCountryById);
router.put("/update/:id", ValidateToken, updateImmersionCountry);
router.delete("/delete/:id", ValidateToken, deleteImmersionCountry);

module.exports = router;
