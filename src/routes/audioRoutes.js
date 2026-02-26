const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory as buffer
const express = require('express');
const router = express.Router();

const controller = require('../controller/audioUploadController');
const { ValidateToken } = require('../middleware/auth');

router.post('/upload-audio', ValidateToken, upload.single('file'), controller.uploadAudio);

module.exports = router;