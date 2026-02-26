const router = require("express").Router();
const DashboardController = require("../controller/dashboardController");
const { ValidateToken } = require("../middleware/auth");

router.get("/get-dashboard", ValidateToken, DashboardController.Dashboard);

router.get("/latest-exam-date", ValidateToken, DashboardController.LatestExamDate);

module.exports = router;
