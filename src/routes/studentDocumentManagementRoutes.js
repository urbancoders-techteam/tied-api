const router = require("express").Router();
const controller = require("../controller/studentDocumentManagementController");
const { ValidateToken } = require("../middleware/auth");

// Upload or update a single document
router.post("/upload-document", ValidateToken, controller.uploadSingleDocument);
router.get(
  "/student-documents",
  ValidateToken,
  controller.getStudentDocumentById
);
router.get(
  "/all-student-documents",
  ValidateToken,
  controller.getAllStudentDocumentManagement
);
router.delete(
  "/delete-document/:category/:field",
  ValidateToken,
  controller.deleteSingleDocument
);
module.exports = router;
