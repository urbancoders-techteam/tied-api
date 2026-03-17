const router = require("express").Router();
const StudentController = require("../controller/studentController");
const { ValidateToken } = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/sign-up", StudentController.signUp);
router.post("/login", StudentController.logIn);
router.post("/log-out", ValidateToken, StudentController.Logout);
router.get("/list-Student", ValidateToken, StudentController.studentList);
router.get(
  "/students-for-batch",
  ValidateToken,
  StudentController.getStudentsForBatch
);

router.get("/get-student/:id", ValidateToken, StudentController.studentGet);
router.delete("/delete/:id", ValidateToken, StudentController.deleteStudent);

// Route for student update
router.put(
  "/update-profile",
  ValidateToken,
  upload.fields([
    { name: "image", maxCount: 1 }, // Single image file
    { name: "documents", maxCount: 10 }, // Multiple documents (up to 10)
  ]),
  StudentController.studentUpdate
);

//Student purchase list according to purchase (Web)
router.get(
  "/student-purchase",
  ValidateToken,
  StudentController.StudentPurchase
);

//Get student enrolled form (admin)
router.get(
  "/student-enrollement",
  ValidateToken,
  StudentController.getEnrollementForm
);

//Student scheduled meeting with faculty
router.post("/schedule", ValidateToken, StudentController.studentSchedule);

//Faculty list
router.get("/faculty-list", ValidateToken, StudentController.facultyList);

//Get in touch form
router.post("/get-in-touch", ValidateToken, StudentController.getInTouch);
// Admin APIs
router.get(
  "/admin/get-in-touch",
  ValidateToken,
  StudentController.getAllGetInTouch
);
router.delete(
  "/admin/get-in-touch/:id",
  ValidateToken,
  StudentController.deleteGetInTouch
);

//Get student for web
router.get("/get-student-web", ValidateToken, StudentController.studentGetWeb);

//Schedule student meeting / contact form (name, email, message, phone, from_name)
router.post("/schedule-meeting", StudentController.scheduleMeetingForm);

//Scheduled meeting get of all student
router.get(
  "/get-meeting",
  ValidateToken,
  StudentController.getScheduledMeeting
);

// Update meeting schedule status
router.put(
  "/schedule-status-update",
  ValidateToken,
  StudentController.updateMeetingStatus
);

//Create Student from admin
router.post("/create", ValidateToken, StudentController.createStudent);
router.delete("/:id", ValidateToken, StudentController.deleteStudent);

//Assign course from admin
router.post("/assign-course", ValidateToken, StudentController.assignCourse);

//Assign Cousellor to Student
router.post(
  "/assign-counsellor",
  ValidateToken,
  StudentController.assignCounsellor
);
// Get Assigned cousellor name to student selection id
//Schedule student meeting
router.get(
  "/get-counsellor",
  ValidateToken,
  StudentController.getAssignedCounsellor
);

//Assing test to student from admin
router.post("/assign-test", ValidateToken, StudentController.assignTest);

//Get assigned test details
router.post(
  "/user-assigned-test",
  ValidateToken,
  StudentController.getAssignedTest
);

//Get assigned course and purchased course
router.post(
  "/assigned-courses",
  ValidateToken,
  StudentController.assignedCourses
);

router.get(
  "/study-abroad-approved",
  ValidateToken,
  StudentController.getStudyAbroadApprovedStudents
);
router.put(
  "/study-abroad-approved/update",
  ValidateToken,
  StudentController.updateStudyAbroadApprovalStatus
);

router.get(
  "/engagement-status",
  ValidateToken,
  StudentController.getStudentStatuses
);

module.exports = router;
