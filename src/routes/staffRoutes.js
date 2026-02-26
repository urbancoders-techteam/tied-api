const router = require("express").Router();
const { route } = require("../../router");
const StaffController = require("../controller/staffController");
const { ValidateToken } = require("../middleware/auth")

router.post("/add-staff", ValidateToken, StaffController.addStaff);
router.post("/login", StaffController.logIn)
router.get("/list-staff", ValidateToken, StaffController.listStaff);
router.post('/log-out', ValidateToken, StaffController.Logout);
router.put("/update-staff/:id", ValidateToken, StaffController.updateStaff);
router.delete("/delete-staff/:id", ValidateToken, StaffController.deleteStaff);
router.get("/get-staff/:id", StaffController.getStaff);
// router.put('/update-attendance', ValidateToken, StaffController.updateAttendance);
// router.post("/list-staff-attendance", ValidateToken, StaffController.listFacultyAttendance);
router.get("/faculty-list", ValidateToken, StaffController.facultyList);
router.get("/counsellor-list", ValidateToken, StaffController.getCounsellorList);

module.exports = router;