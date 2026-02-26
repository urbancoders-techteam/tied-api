const router = require('express').Router();
const DashboardController = require('../controller/learningResourceController');
const { ValidateToken } = require('../middleware/auth');

//Web
router.get('/userLearingResource', ValidateToken, DashboardController.LearningResourceWeb)

//Admin
router.get('/web', ValidateToken, DashboardController.list);
router.post('/create', ValidateToken, DashboardController.addLearningResources);
router.get('/', ValidateToken, DashboardController.listLearningResources);
router.get('/:id', ValidateToken, DashboardController.getLearningResources);
router.put('/update/:id', ValidateToken, DashboardController.updateLearningResources);
router.delete('/delete/:id', ValidateToken, DashboardController.deleteLearningResources);

module.exports = router;