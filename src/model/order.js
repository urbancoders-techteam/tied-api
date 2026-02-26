const mongoose = require("mongoose");
const plansSchema = new mongoose.Schema({
  planName: {
    type: String,
    default: null,
  },
  amount: {
    type: Number,
    default: null,
  },
  planId: {
    type: String,
    default: null,
  },
});
const OrderSchema = mongoose.Schema(
  {
    orderId: {
      type: String,
      default: null,
    },
    razorpayOrderId: {
      type: String,
    },
    dateOfPurchase: {
      type: Date,
      default: null,
    },
    amount: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      default: "pending",
    },
    paymentDate: {
      type: Date,
    },
    plans: {
      type: [plansSchema],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    planDuration: {
      type: String,
    },
    paymentFrom: {
      type: String,
      enum: ["admin", "user"],
      default: "admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
