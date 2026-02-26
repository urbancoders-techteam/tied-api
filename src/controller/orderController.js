const Cart = require("../model/cart");
const Student = require("../model/studentModel");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const cart = require("../model/cart");
const Order = require("../model/order.js");
const { generateOrderUniqueID } = require("../middleware/generateUniqueId.js");
const { addTimeToTimestamp } = require("../middleware/addTimeToTimestamp.js");
const {
  generateRazorpayOrderId,
} = require("../middleware/generateRazorPay.js");
const PaymentModel = require("../model/payment.js");
const Plan = require("../model/plan.js");
const { path } = require("../../router.js");
const Staff = require("../model/staffModel.js");
const UserProductDetails = require("../model/userProductDetail.js");
const { getSignedUrlImage } = require("../helper/uploadToS3.js");

//Section - Add order
exports.addOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const id = req?.meta?._id;

    const student = await Student.findById({ _id: id });
    if (!student) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    const cartPlan = await cart.find({ user: id });
    const cartItems = cartPlan?.flatMap((cart) => cart.items) || [];

    for (const item of items) {
      const matchingCartItem = cartItems.find(
        (cartItem) =>
          cartItem.planId === item.planId &&
          cartItem.planName === item.planName &&
          cartItem.amount === parseInt(item.amount)
      );

      if (!matchingCartItem) {
        return sendResponse(res, 400, null, "Item not found in the cart");
      }
      const isValidPlan = await Plan.findOne({
        id: item.planId,
        title: item.planName,
        packagePrice: item.amount,
      });

      if (!isValidPlan) {
        return sendResponse(res, 400, null, "Invalid plan found in the cart");
      }
    }

    let totalAmount = 0;
    await Promise.all(items.map((item) => (totalAmount += item?.amount || 0)));
    const generateOrderId = await generateOrderUniqueID();
    const razorpayOrderId = await generateRazorpayOrderId(totalAmount);
    const paymentDate = await addTimeToTimestamp(new Date().toISOString());

    const data = await Order.create({
      orderId: generateOrderId,
      dateOfPurchase: paymentDate,
      razorpayOrderId: razorpayOrderId,
      amount: totalAmount,
      plans: items,
      createdBy: req?.meta?._id,
    });

    const paymentData = await PaymentModel.create({
      orderId: data?.id,
      paymentId: "",
      totalAmount: totalAmount,
      createdBy: req?.meta?._id,
      paymentDate: paymentDate,
    });
    await Promise.all(
      data.plans.map(async (item) => {
        // Fetch plan details using 'id' field instead of '_id'
        const plan = await Plan.findOne({ id: item.planId });
        if (!plan) {
          console.log("Plan not found for planId:", item.planId);
          return;
        }

        // Check if the user already has product details for this plan
        const existingProduct = await UserProductDetails.findOne({
          userId: student._id,
          planId: plan._id,
        }).sort({ createdAt: -1 });

        if (existingProduct) {
          // Update existing product with the new order ID
          await UserProductDetails.findByIdAndUpdate(existingProduct._id, {
            $set: {
              orderId: existingProduct._id,
            },
          });
        } else {
          // Create new UserProductDetails
          await UserProductDetails.create({
            userId: student._id,
            orderId: data._id,
            planId: plan._id,
            productId: item.planId,
            createdBy: student._id,
          });
        }
      })
    );

    sendResponse(res, 200, data, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Add to cart
exports.addToCart = async (req, res) => {
  try {
    const { items } = req.body;

    for (let item of items) {
      const plan = await Plan.findOne({ id: item.planId });
      if (!plan) {
        return sendResponse(res, 400, null, Messages.PLAN_NOT_MATCH);
      }
      if (plan.title !== item.planName) {
        return sendResponse(res, 400, null, Messages.PLAN_NOT_MATCH);
      }
      if (plan.packagePrice !== parseInt(item.amount)) {
        return sendResponse(res, 400, null, Messages.PLAN_NOT_MATCH);
      }
    }

    const cart = new Cart({
      user: req?.meta?._id,
      items: items.map((item) => ({
        planName: item.planName,
        amount: item.amount,
        planId: item.planId,
      })),
    });

    await cart.save();
    sendResponse(res, 200, cart, Messages.DATA_CREATED);
  } catch (err) {
    console.log("error", err);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - Get Cart
exports.getCart = async (req, res) => {
  try {
    const id = req?.meta?._id;
    const data = await Cart.find({ user: id });
    if (!data) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    console.log(
      "data",
      data.map((item) => item.items)
    );

    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (err) {
    console.log("err", err);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - Order summary
exports.getOrderSummary = async (req, res) => {
  try {
    const id = req?.meta?._id;
    const data = await Cart.find({ user: id });
    if (!data || data.length === 0)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    let totalAmount = 0;
    for (const cart of data) {
      totalAmount += cart.items.reduce((acc, item) => acc + item.amount, 0);
    }
    totalItem = data.length;
    sendResponse(
      res,
      200,
      { totalAmount, totalItem },
      "Total amount calculated"
    );
  } catch (err) {
    console.log("err", err);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - Delete Cart
exports.deleteCartItem = async (req, res) => {
  try {
    const id = req.params.id;

    const data = await Cart.updateMany(
      { "items._id": id },
      { $pull: { items: { _id: id } } }
    );
    console.log("data", data);
    if (!data) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    console.log("error", error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - Order list for admin WITH SEARCH
exports.orderListAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    // ----- SEARCH LOGIC -----
    let query = {};

    if (search) {
      query = {
        $or: [
          { orderId: { $regex: search, $options: "i" } },
          { "plans.planName": { $regex: search, $options: "i" }}
        ]
      };
    }
    const count = await Order.countDocuments(query);

    // Fetch orders
    const listOrder = await Order.find(query)
      .populate({
        path: "createdBy",
        model: "Student",
        select: "username email",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const result = listOrder.map((item) => ({
      _id: item?._id,
      orderId: item?.orderId,
      dateOfPurchase: item?.dateOfPurchase,
      amount: item?.amount,
      paymentStatus: item?.paymentStatus,
      planNames: item?.plans?.map((plan) => plan.planName) ?? [],
      createdBy: item?.createdBy?.username,
    }));

    return sendResponse(res, 200, {
      listOrder: result,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parsedLimit),
      totalItems: count,
      limit: parsedLimit,
    });
  } catch (error) {
    console.error("Admin Order List Error:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ISSUE);
  }
};

//Section - Order detail for admin
exports.orderDetailAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const checkStaff = await Staff.findById(req?.meta?._id);
    if (!checkStaff)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    const searchOrder = await Order.findById(id).populate({
      path: "createdBy",
      select: "username email",
    });

    if (!searchOrder) {
      return sendResponse(res, 404, null, "Order not found");
    }

    const formattedData = {
      orderId: searchOrder.orderId,
      amount: searchOrder.amount,
      dateOfPurchase: searchOrder.dateOfPurchase,
      paymentStatus: searchOrder.paymentStatus,
      plans: searchOrder.plans.map((plan) => ({
        planName: plan.planName,
        price: plan.amount,
        planId: plan.planId,
      })),
      createdBy: {
        name: searchOrder.createdBy.username,
        email: searchOrder.createdBy.email,
      },
    };

    sendResponse(res, 200, formattedData, "Data retrieved successfully");
  } catch (error) {
    console.error("Error retrieving order details:", error);
    sendResponse(res, 500, null, "Internal server error");
  }
};

//Section - Order list of each Student
exports.orderListStudent = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const count = await Order.countDocuments({ createdBy: req?.meta?._id });
    const listOrder = await Order.find({ createdBy: req?.meta?._id })
      .select("orderId amount dateOfPurchase paymentStatus")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendResponse(res, 200, {
      listOrder,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      totalItems: count,
      limit: parseInt(limit),
    });
  } catch (error) {
    return sendResponse(res, 500, null, Messages.INTERNAL_ISSUE);
  }
};

//Section - Order detail for student
exports.orderDetailStudent = async (req, res) => {
  try {
    const checkStudent = await Student.findById(req?.meta?._id);
    if (!checkStudent)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    const { id } = req.params;
    const searchOrder = await Order.findById(id).populate({
      path: "createdBy",
      select: "username email image",
    });

    if (!searchOrder) {
      return sendResponse(res, 404, null, "Order not found");
    }

    const formattedData = {
      orderId: searchOrder.orderId,
      amount: searchOrder.amount,
      dateOfPurchase: searchOrder.dateOfPurchase,
      paymentStatus: searchOrder.paymentStatus,
      plans: searchOrder.plans.map((plan) => ({
        planName: plan.planName,
        price: plan.amount,
        planId: plan.planId,
      })),
      createdBy: {
        name: searchOrder.createdBy.username,
        email: searchOrder.createdBy.email,
        image: searchOrder.createdBy.image
          ? await getSignedUrlImage(searchOrder.createdBy.image)
          : null,
      },
    };

    sendResponse(res, 200, formattedData, "Data retrieved successfully");
  } catch (error) {
    console.error("Error retrieving order details:", error);
    sendResponse(res, 500, null, "Internal server error");
  }
};

//Section - Get all plans
exports.getPlans = async (req, res) => {
  try {
    const result = await Plan.find().select("title");
    sendResponse(res, 200, result, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

// SECTION: create Study Abroad Order
exports.createStudyAbroadOrder = async (req, res) => {
  try {
    const { planId, planName, amount } = req.body;

    const id = req?.meta?._id;

    const student = await Student.findById({ _id: id });
    if (!student) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    if (amount < 0) return sendResponse(res, 400, null, Messages.AMOUNT_ERROR);

    const isValidPlan = await Plan.findOne({
      id: planId,
      title: planName,
    });

    if (!isValidPlan) {
      return sendResponse(res, 400, null, Messages.PLAN_NOT_MATCH);
    }

    const generateOrderId = await generateOrderUniqueID();
    const razorpayOrderId = await generateRazorpayOrderId(amount);
    const paymentDate = await addTimeToTimestamp(new Date().toISOString());

    const data = await Order.create({
      orderId: generateOrderId,
      dateOfPurchase: paymentDate,
      razorpayOrderId: razorpayOrderId,
      amount: amount,
      plans: [{ planId, planName, amount }],
      createdBy: req?.meta?._id,
      paymentFrom: "user",
    });

    await PaymentModel.create({
      orderId: data?.id,
      paymentId: "",
      totalAmount: amount,
      createdBy: req?.meta?._id,
      paymentDate: paymentDate,
    });
    await Promise.all(
      data.plans.map(async (item) => {
        const plan = await Plan.findOne({ id: item.planId });
        if (!plan) {
          return sendResponse(res, 400, null, Messages.PLAN_NOT_MATCH);
        }

        const existingProduct = await UserProductDetails.findOne({
          userId: student._id,
          planId: plan._id,
        }).sort({ createdAt: -1 });

        if (existingProduct) {
          await UserProductDetails.findByIdAndUpdate(existingProduct._id, {
            $set: {
              orderId: existingProduct._id,
              paymentFrom: "user",
            },
          });
        } else {
          await UserProductDetails.create({
            userId: student._id,
            orderId: data._id,
            planId: plan._id,
            productId: item.planId,
            paymentFrom: "user",
            createdBy: student._id,
          });
        }
      })
    );

    sendResponse(res, 200, data, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};
