const mongoose = require('mongoose');

const webBannerSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    bannerImg: {
        type: String, // Base64 image URL
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff', // Reference to the User model
        required: true,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff', // Reference to the User model
        required: false,
    },
    }, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
});

const WebBanner = mongoose.model('WebBanner', webBannerSchema);

module.exports = WebBanner;