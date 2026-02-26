const router = require("express").Router();
const { route } = require("../../router");
const PaymentController = require("../controller/paymentController");
const { ValidateToken } = require("../middleware/auth");

router.post("/verify-Payment", ValidateToken, PaymentController.paymentVerify);

router.post(
  "/verify-study-abroad-payment",
  ValidateToken,
  PaymentController.verifyStudyAbroadPayment
);

router.get("/list-payment", ValidateToken, PaymentController.listPayment);

module.exports = router;
