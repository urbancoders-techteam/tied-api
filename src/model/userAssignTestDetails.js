const mongoose = require("mongoose");

const UserAssignTestSchema = new mongoose.Schema({
    userId: {
        required: false,
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: null
    },
    testId: {
        required: false,
        type: mongoose.Schema.Types.ObjectId,
        ref: "Test",
        default: null
    },
    mockTest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MockTest",
        required: false,
        default: null
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

const UserAssignTest = mongoose.model("UserAssignTest", UserAssignTestSchema);
module.exports = UserAssignTest;
