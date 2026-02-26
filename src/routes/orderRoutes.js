const router = require("express").Router();
const { route } = require("../../router");
const orderController = require("../controller/orderController");
const { ValidateToken } = require("../middleware/auth");

router.post("/add-cart", ValidateToken, orderController.addToCart);
router.get("/get-cart", ValidateToken, orderController.getCart);
router.get("/order-summary", ValidateToken, orderController.getOrderSummary);
router.delete(
  "/delete-cart-item/:id",
  ValidateToken,
  orderController.deleteCartItem
);

// order
router.post("/add-order", ValidateToken, orderController.addOrder);
// router.get("/list-order", ValidateToken, orderController.listOrder)

router.post(
  "/create-study-abroad-order",
  ValidateToken,
  orderController.createStudyAbroadOrder
);

//Admin
router.get("/list-order-admin", ValidateToken, orderController.orderListAdmin);
router.get(
  "/order-detail-admin/:id",
  ValidateToken,
  orderController.orderDetailAdmin
);

//Student
router.get(
  "/list-order-student",
  ValidateToken,
  orderController.orderListStudent
);
router.get(
  "/order-detail-student/:id",
  ValidateToken,
  orderController.orderDetailStudent
);

router.get("/list-plan", orderController.getPlans);

module.exports = router;
