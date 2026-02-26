const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    icon: {
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

const Country = mongoose.model('Country', countrySchema);
module.exports = Country;