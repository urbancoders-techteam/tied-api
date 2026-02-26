const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    token: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("Token", TokenSchema);