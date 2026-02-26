const router = require("express").Router();
const {
  createIndianUniversity,
  listIndianUniversities,
  getIndianUniversityById,
  updateIndianUniversity,
  deleteIndianUniversity,
  webListIndianUniversities,
  getIndianUniversityDetailsById,
} = require("../controller/indianUniversitiesController.js");
const { ValidateToken } = require("../middleware/auth.js");

// Web - No token required
router.get("/web/list", webListIndianUniversities);
router.get("/web/:id", getIndianUniversityDetailsById);

// admin
router.post("/create", ValidateToken, createIndianUniversity);
router.get("/", ValidateToken, listIndianUniversities);
router.get("/:id", ValidateToken, getIndianUniversityById);
router.put("/update/:id", ValidateToken, updateIndianUniversity);
router.delete("/delete/:id", ValidateToken, deleteIndianUniversity);

module.exports = router;
