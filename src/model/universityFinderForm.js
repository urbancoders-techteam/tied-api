const mongoose = require('mongoose');

const universityFinderFormSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: Number, required: true }
    },
    {
        timestamps: true
    }
);

const UniversityFinderForm = mongoose.model('UniversityFinderForm', universityFinderFormSchema)
module.exports = UniversityFinderForm;