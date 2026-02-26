const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema({
    name: {
        type: String,
        default: null
    },
    mobile: {
        type: Number,
        default: null
    },
    email: {
        type: String,
        default: null
    },
    role: {
        type: mongoose.Types.ObjectId,
        ref: "Role"
    },
    password: {
        type: String,
        default: null
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        ref: 'Staff',
        default: null
    },
    updatedBy: {
        type: mongoose.Types.ObjectId,
        ref: 'Staff',
        default: null
    },
   
},
    { timestamps: true }
)
module.exports = mongoose.model('Staff', StaffSchema);
