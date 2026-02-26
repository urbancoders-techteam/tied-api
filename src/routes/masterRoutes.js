const router = require("express").Router();
const { route } = require("../../router");
const { ValidateToken } = require('../middleware/auth');
const RoleController = require('../controller/masterController');
const PermissionController = require('../controller/masterController');
const RouteController = require("../controller/masterController")

router.post('/add-role', ValidateToken, RoleController.addRole)
router.get('/list-role', ValidateToken, RoleController.listRoles)
router.get('/get-role/:id', ValidateToken, RoleController.getRole)
router.put('/update-role/:id', ValidateToken, RoleController.updateRole)
router.delete('/delete-role/:id', ValidateToken, RoleController.deleteRole)

//forget password routes
router.post('/forget-password-user', RouteController.forgotPasswordUser);
router.post('/verify-otp-user', ValidateToken, RouteController.verifyOtpUser);
router.post('/reset-password', ValidateToken, RouteController.resetPassword);


//Field of interest
router.post('/add-field-interest', ValidateToken, RouteController.createFieldOfInterest);
router.get('/list-field-interest', ValidateToken, RouteController.listFieldOfInterest);
router.get('/get-field-interest/:id', ValidateToken, RouteController.getFieldOfInterest);
router.put('/update-field-interest/:id', ValidateToken, RouteController.updateFieldOfInterest);
router.delete('/delete-field-interest/:id', ValidateToken, RouteController.deleteFieldOfInterest);

//Country
router.post('/add-country', ValidateToken, RouteController.addCountry);
router.get('/list-country', ValidateToken, RouteController.listCountry);
router.get('/get-country/:id', ValidateToken, RouteController.getCountry);
router.put('/update-country/:id', ValidateToken, RouteController.updateCountry);
router.delete('/delete-country/:id', ValidateToken, RouteController.deleteCountry);

//States
router.post('/add-state', ValidateToken, RouteController.addState);
router.get('/list-state', ValidateToken, RouteController.listState);
router.get('/get-state/:id', ValidateToken, RouteController.getStates);
router.put('/update-state/:id', ValidateToken, RouteController.updateState);
router.delete('/delete-state/:id', ValidateToken, RouteController.deleteState);

//Unversity
router.post('/add-university', ValidateToken, RouteController.addUnversity);
router.get('/list-university', ValidateToken, RouteController.listUniversity);
router.get('/get-university/:id', ValidateToken, RouteController.getUniversity);
router.put('/update-university/:id', ValidateToken, RouteController.updateUnversity);
router.delete('/delete-university/:id', ValidateToken, RouteController.deleteUniversity);

//Faq
router.post('/add-faq', ValidateToken, RouteController.addFAQ);
router.get('/list-faq', ValidateToken, RouteController.listFAQ);
router.get('/get-faq/:id', ValidateToken, RouteController.getFAQ);
router.put('/update-faq/:id', ValidateToken, RouteController.updateFAQ);
router.delete('/delete-faq/:id', ValidateToken, RouteController.deleteFAQ);
router.get('/web-list', ValidateToken, RouteController.webList)

//byCountryId
router.post("/states", RoleController.byCountryId);
module.exports = router
