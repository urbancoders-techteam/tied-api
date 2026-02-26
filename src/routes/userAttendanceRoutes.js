const router = require('express').Router();
const controller = require('../controller/userAttendance');
const { ValidateToken } = require('../middleware/auth');

router.post('/user-list', ValidateToken, controller.userList);
router.post('/mark-attendance', ValidateToken, controller.markAttendance);

module.exports = router;
