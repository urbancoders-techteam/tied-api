const router = require("express").Router();
const controller = require("../controller/authController");
const { ValidateToken } = require("../middleware/auth");

router.put("/forget-password",ValidateToken, controller.forgetPassword);

module.exports = router;