const express = require('express');
const router = express.Router();
const controller = require('../controller/enrollementFormController');
const { ValidateToken } = require("../middleware/auth")

router.post('/add-enrollement-form', ValidateToken, controller.addEnrollementForm);
router.get('/list-enrollement-form', ValidateToken, controller.listEnrollementForm);
router.get('/get-enrollement-form/:id', ValidateToken, controller.getEnrollementForm);

module.exports = router;