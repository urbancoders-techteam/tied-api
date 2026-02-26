const router = require('express').Router();
const controller = require('../controller/bannerController');
const { ValidateToken } = require('../middleware/auth');

//Web
router.get('/web', ValidateToken, controller.webListBanner);

//Admin
router.post('/create', ValidateToken, controller.createBanner);
router.get('/', ValidateToken, controller.listBanner);
router.get('/:id', ValidateToken, controller.getById);
router.put('/update/:id', ValidateToken, controller.updateBanner);
router.delete('/delete/:id', ValidateToken, controller.deleteBanner);

module.exports = router;