const router = require("express").Router();
const controller = require("../controller/postEnrollmentSupportController");
const { ValidateToken } = require("../middleware/auth");

router.post(
  "/create",
  ValidateToken,
  controller.createOrUpdateEnrollmentSupport
);

router.get("/", ValidateToken, controller.getPostEnrollmentSupportByStudent);

router.get(
  "/staff/all",
  ValidateToken,
  controller.getAllPostEnrollmentSupportForStaff
);

router.post(
  "/get-status",
  ValidateToken,
  controller.getPostEnrollmentSupportByType
);
router.post(
  "/update-status",
  ValidateToken,
  controller.updatePostEnrollmentSupportStatus
);

module.exports = router;
