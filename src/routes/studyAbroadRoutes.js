const router = require("express").Router();
const controller = require("../controller/studyAbroadController");
const { ValidateToken } = require("../middleware/auth");

router.put(
  "/update-pyschometric-status",
  ValidateToken,
  controller.updatePsychometricTestStatus
);

router.get("/get-status", ValidateToken, controller.getStatus);

module.exports = router;
