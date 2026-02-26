const mongoose = require("mongoose");

const fieldOfInterestSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
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
)

const FieldOfInterest = mongoose.model('FieldOfInterest', fieldOfInterestSchema);
module.exports = FieldOfInterest;
