const express = require("express");
const router = express.Router();
const {
  uploadAdmissionFiles,
  listAdmissionServices,
  updateAdmissionService,
  getAdmissionFieldById,
  getAdmissionServiceBySortlistId,
} = require("../controller/admissionServiceController");

// Middleware
const { ValidateToken } = require("../middleware/auth");

//web
router.post("/", ValidateToken, getAdmissionServiceBySortlistId);

//admin
router.post("/upload", ValidateToken, uploadAdmissionFiles);
router.get("/list", ValidateToken, listAdmissionServices);
router.put("/update", ValidateToken, updateAdmissionService);
router.get("/:id/:type", ValidateToken, getAdmissionFieldById);

module.exports = router;
