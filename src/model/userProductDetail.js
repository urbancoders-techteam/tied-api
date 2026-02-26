const mongoose = require("mongoose");

const UserProductSchema = new mongoose.Schema({
    userId: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student"
    },
    orderId: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    },
    planId: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan"
    },
    productId: { type: String },
    paymentFrom: {
        type: String,
        enum: ['admin', 'user'],
        default: 'admin'
    },
    status: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: null
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        default: null
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: null
    }
},
    {
        timestamps: true
    }
);

const UserProductDetails = mongoose.model("UserProductDetails", UserProductSchema);
module.exports = UserProductDetails;
