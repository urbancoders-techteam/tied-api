const express = require('express');
const router = express.Router();
const controller = require('../controller/preCounsellingFormController');
const { ValidateToken } = require("../middleware/auth")


router.post('/add-form', ValidateToken, controller.addForm);
router.get('/list-form', ValidateToken, controller.listForm);
router.get('/get-form-admin/:id', ValidateToken, controller.getFormAdmin);
router.get('/get-form-student/:id', ValidateToken, controller.getFormStudent);
module.exports = router;
