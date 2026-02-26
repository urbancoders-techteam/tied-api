const router = require("express").Router();
const {
  createPersonalCounsellor,
  getPersonalCounsellor,
  getPersonalCounsellorById,
  updatePersonalCounsellor,
  deletePersonalCounsellor,
  getPersonalCounsellorByStudentId,
  updatePersonalCounsellorMeeting,
  updatePersonalCounsellorMarkAsDone,
} = require("../controller/personalCounsellorController");
const { ValidateToken } = require("../middleware/auth");

router.get("/student", ValidateToken, getPersonalCounsellorByStudentId);
router.post("/create", ValidateToken, createPersonalCounsellor);
router.get("/", ValidateToken, getPersonalCounsellor);
router.get("/:id", ValidateToken, getPersonalCounsellorById);
router.put("/update/:id", ValidateToken, updatePersonalCounsellor);
router.delete("/delete/:id", ValidateToken, deletePersonalCounsellor);
router.put("/update-meeting", ValidateToken, updatePersonalCounsellorMeeting);
router.put(
  "/update-mark-as-done/:id",
  ValidateToken,
  updatePersonalCounsellorMarkAsDone
);

module.exports = router;
