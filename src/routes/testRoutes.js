const express = require("express");
const router = express.Router();

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() }); // ✅ Memory storage

const controller = require("../controller/testController");
const { ValidateToken } = require("../middleware/auth");

router.get("/web-dashboard", ValidateToken, controller.webDashboard);
router.get("/mock-graph", ValidateToken, controller.mockTestGraph);
router.get(
  "/practice-graph",
  ValidateToken,
  controller.practiceAssignmentGraph
);
/* ----------------------------- Admin ---------------------------*/
router.post("/create", ValidateToken, controller.createTest);
router.get("/", ValidateToken, controller.listTest);
router.get("/list-tests", ValidateToken, controller.listTestWithoutPagination);
router.get("/:id", ValidateToken, controller.getTest);
router.put("/update/:id", ValidateToken, controller.updateTest);
router.delete("/delete/:id", ValidateToken, controller.deleteTest);
router.post("/parentList", ValidateToken, controller.getParentListByType);
router.post("/student-get", ValidateToken, controller.getStudent);
router.post("/plan-by-type", ValidateToken, controller.planByType);

//MockTest
router.post("/user-submited-answer", ValidateToken, controller.getUserAnswer);
router.post(
  "/admin-submit",
  ValidateToken,
  upload.single("answerKey"),
  controller.adminCheckAnswer
);

//PracticeAssignment
router.post(
  "/user-submited-practice-answer",
  ValidateToken,
  controller.getUserPracticeAnswer
);
router.post(
  "/admin-submit-practice",
  ValidateToken,
  controller.checkPracticeAnswer
);

/* ----------------------------- Web -------------------------------- */

//MockTest
router.post("/byType", ValidateToken, controller.getTestByType);
router.post("/testById", ValidateToken, controller.testById);
router.post("/types", ValidateToken, controller.getTypes);
router.post(
  "/submitAnswer",
  ValidateToken,
  upload.any(),
  controller.submitAnswer
);

router.post(
  "/user-checked-answer",
  ValidateToken,
  controller.getUserCheckAnswer
);

//PracticeAssignment
router.post("/byPracticesType", ValidateToken, controller.getPracticeByType);
router.post("/practicetypes", ValidateToken, controller.getPracticeTypes);
router.post("/practiceById", ValidateToken, controller.practiceById);
router.post(
  "/submitPracticeAnswer",
  ValidateToken,
  controller.submitPracticeAnswer
);
router.post(
  "/practice-checked-answer",
  ValidateToken,
  controller.getUserPracticeCheckAnswer
);

//Performance section
router.post("/user-mock-list", ValidateToken, controller.getUserMockTestCount);
router.post(
  "/user-practice-list",
  ValidateToken,
  controller.getUserPracticeAssignmentCount
);
// router.post('/delete-image', controller.deleteImage);

module.exports = router;
