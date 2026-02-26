const router = require("express").Router();
const controller = require("../controller/psychometricTestController");
const { ValidateToken } = require("../middleware/auth");

router.get(
  "/pyschometric-status",
  ValidateToken,
  controller.getPsychometricTestStatus
);
router.post("/upload", ValidateToken, controller.uploadPsychometricTest);
router.get("/", ValidateToken, controller.getAllPsychometricTests);
router.get(
  "/get-testReport",
  ValidateToken,
  controller.getPsychometricTestDocument
);
router.post(
  "/update-status",
  ValidateToken,
  controller.updatePsychometricTestStatus
);

router.get(
  "/test-report-status",
  ValidateToken,
  controller.getPsychometricTestReportStatus
);

module.exports = router;
