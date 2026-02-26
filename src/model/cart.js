const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
    planName: {
        type: String,
        default:null
    },
    amount: {
        type: Number,
        default:null
    },
    planId: {
        type: String,
        default: null
    }
    
},)

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "Student"
    },
    items: [cartItemSchema]
})

module.exports = mongoose.model('cart', cartSchema)