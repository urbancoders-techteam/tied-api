const router = require("express").Router();
const {
  getAllStudentPersonalCounsellorLogs,
  getAllStudentPersonalCounsellorLogsWeb,
  createStudentPersonalCounsellorLogs,
} = require("../controller/studentPersonalCounsellorLogs");
const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, createStudentPersonalCounsellorLogs);
router.get("/", ValidateToken, getAllStudentPersonalCounsellorLogs);
router.get("/web", ValidateToken, getAllStudentPersonalCounsellorLogsWeb);

module.exports = router;
