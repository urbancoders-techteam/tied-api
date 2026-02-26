const Order = require("../model/order");
const Cart = require("../model/cart");
const Payment = require("../model/payment");
const Student = require("../model/studentModel");
const crypto = require("crypto");

const { addTimeToTimestamp } = require("../middleware/addTimeToTimestamp");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const { getFutureDateTime } = require("../helper/lib");

exports.paymentVerify = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const paymentDate = await addTimeToTimestamp(new Date().toISOString());
    const id = req?.meta?._id;

    const cart = await Cart.find({ user: id });
    console.log("cart", cart);

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature == razorpay_signature) {
      const updatedOrder = await Order.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
        },
        {
          $set: {
            paymentStatus: "paid",
            paymentDate: getFutureDateTime(),
          },
        }
      );

      await Payment.findOneAndUpdate(
        {
          orderId: updatedOrder._id,
        },
        {
          $set: {
            paymentId: razorpay_payment_id,
            paymentStatus: "paid",
            paymentDate: getFutureDateTime(),
          },
        }
      );
      await Cart.deleteMany({ user: id });
      return res.status(200).json({
        success: true,
        message: "Payment successful",
      });
    } else {
      const updatedOrder = await Order.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
        },
        {
          $set: {
            paymentStatus: "failed",
            paymentDate: paymentDate,
          },
        }
      );

      const payment = await Payment.findOneAndUpdate(
        {
          orderId: updatedOrder._id,
        },
        {
          $set: {
            paymentId: razorpay_payment_id,
            paymentStatus: "failed",
            paymentDate: paymentDate,
          },
        },
        { returnDocument: "after" }
      );
      return res.status(500).json({
        success: false,
        message: "Payment failed",
      });
    }
  } catch (err) {
    console.log(err);
    return sendResponse(res, 500, null, Messages.INTERNAL_ISSUE);
  }
};

exports.listPayment = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    const count = await Payment.countDocuments(query);
    const data = await Payment.find(query)
      .populate([
        {
          path: "orderId",
        },
        {
          path: "createdBy",
        },
      ])
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    const totalPage = Math.ceil(count / parseInt(limit));
    sendResponse(
      res,
      200,
      {
        data,
        totalPage: totalPage,
        count: count,
        currentPage: parseInt(page),
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    console.log(error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

// SECTION: Add Verify Study Abroad Payment
exports.verifyStudyAbroadPayment = async (req, res) => {
  try {
    const studentId = req?.meta?._id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const paymentDate = await addTimeToTimestamp(new Date().toISOString());

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature == razorpay_signature) {
      const updatedOrder = await Order.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
        },
        {
          $set: {
            paymentStatus: "paid",
            paymentDate: getFutureDateTime(),
          },
        }
      );

      await Payment.findOneAndUpdate(
        {
          orderId: updatedOrder._id,
        },
        {
          $set: {
            paymentId: razorpay_payment_id,
            paymentStatus: "paid",
            paymentDate: getFutureDateTime(),
          },
        }
      );

      //NOTE: Update study aboard details.
      await Student.findByIdAndUpdate(studentId, {
        $set: {
          "studyAbroadDetails.isStudyAbroadApproved": true,
          isStudyAbroadApproved: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Payment successful",
      });
    } else {
      const updatedOrder = await Order.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
        },
        {
          $set: {
            paymentStatus: "failed",
            paymentDate: paymentDate,
          },
        }
      );

      await Payment.findOneAndUpdate(
        {
          orderId: updatedOrder._id,
        },
        {
          $set: {
            paymentId: razorpay_payment_id,
            paymentStatus: "failed",
            paymentDate: paymentDate,
          },
        },
        { returnDocument: "after" }
      );
      return res.status(500).json({
        success: false,
        message: "Payment failed",
      });
    }
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
