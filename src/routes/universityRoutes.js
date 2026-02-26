const express = require("express");
const router = express.Router();
const controller = require("../controller/universityController");
const listController = require("../controller/masterController");
const { ValidateToken } = require("../middleware/auth");

const multer = require("multer");

//NOTE: Configure multer for file storage (example: in memory)
const storage = multer.memoryStorage();
const uploadFileWithMulter = multer({ storage });

//Admin
router.get("/leads", controller.universityFinderLead);
router.get("/leads/csv", ValidateToken, controller.universityFinderLeadCSV);
router.post(
  "/bulk-upload",
  ValidateToken,
  uploadFileWithMulter.single("file"),
  controller.universityUpload
);
router.get("/bulkUploadList", ValidateToken, controller.bulkUploadedList);

//Web
router.get("/csv", controller.universityExcel);
router.post("/universityFilter", controller.universityFilter);
router.post("/compareUniveristy", controller.universityComparsion);
router.get("/countryList", listController.listCountryWeb);
router.get("/stateList", listController.listStateWeb);
router.get("/courseList", listController.listFieldOfInterestWeb);
router.post("/form", controller.universityFinderForm);
router.get("/unique-university", controller.listUniqueUniversity);
router.get('/university-course-name',controller.getCoursesByUniversityName);
module.exports = router;
