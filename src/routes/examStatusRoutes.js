const router = require("express").Router();
const controller = require("../controller/examStatusController");
const { ValidateToken } = require("../middleware/auth");

router.post(
  "/create-update",
  ValidateToken,
  controller.createOrUpdateExamStatus
);

router.get("/", ValidateToken, controller.getExamStatuses);

module.exports = router;