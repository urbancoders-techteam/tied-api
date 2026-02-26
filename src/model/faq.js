const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: {
        type: String
    },
    answer: {
        type: String
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
);
const FAQ = mongoose.model('FAQ', faqSchema);
module.exports = FAQ;