const router = require('express').Router();
const controller = require('../controller/practiceAssignmentController');
const { ValidateToken } = require('../middleware/auth');

//Web
// router.get('/userLearingResource', ValidateToken, controller.LearningResourceWeb)

//Admin
router.get('/web', ValidateToken, controller.dropDownList);
router.post('/create', ValidateToken, controller.create);
router.get('/', ValidateToken, controller.list);
router.get('/:id', ValidateToken, controller.get);
router.put('/update/:id', ValidateToken, controller.update);
router.delete('/delete/:id', ValidateToken, controller.delete);
module.exports = router;