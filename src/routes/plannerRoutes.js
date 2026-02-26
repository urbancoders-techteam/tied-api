const express = require('express');
const router = express.Router();
const controller = require('../controller/plannerController');
const { ValidateToken } = require('../middleware/auth');

router.post('/student-planner', ValidateToken, controller.studentPlan);
router.post('/planner-detail', ValidateToken, controller.getClassAndMockTestDetails);
// router.get('/number-of-students', ValidateToken, controller.getNumberOfStudent);
router.post('/class-join', ValidateToken, controller.classJoin);

module.exports = router;