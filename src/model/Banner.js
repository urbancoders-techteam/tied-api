const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan'
        },
        date: {
            type: Date,
        },
        title: {
            type: String
        },
        description: {
            type: String
        },
        image: {
            type: String
        },
        numberOfClass: {
            type: Number
        },
        numberOfMockTest: {
            type: Number
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Staff",
            required: true
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Staff",
            default: null
        }
    },
    {
        timestamps: true
    }
);
const Banner = mongoose.model('Banner', bannerSchema);
module.exports = Banner;
