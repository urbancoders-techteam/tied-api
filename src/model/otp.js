const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
    mobile: {
        type: Number,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 
    },
    isVerified: { type: Boolean, required: true, default: false },
});

module.exports = mongoose.model('OTP', OTPSchema);
