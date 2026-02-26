const mongoose = require('mongoose');

const mockTestSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        time: {
            type: String,
            required: true
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan'
        },
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
    },
    {
        timestamps: true
    }
);

const MockTest = mongoose.model('MockTest', mockTestSchema);
module.exports = MockTest;