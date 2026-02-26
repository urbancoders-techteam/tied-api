const mongoose = require("mongoose");

const PaymentSchema = mongoose.Schema(
    {
        orderId: {
            type: mongoose.Types.ObjectId,
            ref: "Order",
        },
        paymentId: {
            type: String,
        },
        paymentStatus: {
            type: String,
            default: "pending"
        },
        paymentDate: {
            type: Date,
        },
        totalAmount: {
            type: Number,
        },
        createdBy: {
            type: mongoose.Types.ObjectId,
            ref: "Student",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);