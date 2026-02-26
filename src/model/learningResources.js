const mongoose = require('mongoose');
const bookletSchema = new mongoose.Schema({
    name: { type: String },
    pdf: { type: String },
})
const learningResourceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
    },
    date: {
        type: Date,
        required: true
    },
    booklet: [bookletSchema],
    createdBy: {
        type: mongoose.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    updatedBy: {
        type: mongoose.Types.ObjectId,
        ref: 'Staff',
        default: null
    },

}, { timestamps: true }
)

const LearningResource = mongoose.model('LearningResource', learningResourceSchema);
module.exports = LearningResource;