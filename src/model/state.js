const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema(
    {
        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Country",
            required: true
        },
        name: {
            type: String,
            required: true
        },
        image: {
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
);
const State = mongoose.model("State", stateSchema);
module.exports = State;