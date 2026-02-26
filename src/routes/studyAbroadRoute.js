const router = require("express").Router();

const {
  createStudyAbroadUniversities,
  listStudyAbroadUniversities,
  webListStudyAbroadUniversities,
  getStudyAbroadUniversityDetailsById,
  getStudyAbroadUniversityById,
  updateStudyAbroadUniversity,
  deleteStudyAbroadUniversity,
} = require("../controller/studyAbroadUniversitiesController.js");
const { ValidateToken } = require("../middleware/auth.js");

// Web - No token required
router.get("/web/list", webListStudyAbroadUniversities);
router.get("/web/:id", getStudyAbroadUniversityDetailsById);

// admin
router.post("/create", ValidateToken, createStudyAbroadUniversities);
router.get("/", ValidateToken, listStudyAbroadUniversities);
router.get("/:id", ValidateToken, getStudyAbroadUniversityById);
router.put("/update/:id", ValidateToken, updateStudyAbroadUniversity);
router.delete("/delete/:id", ValidateToken, deleteStudyAbroadUniversity);

module.exports = router;
