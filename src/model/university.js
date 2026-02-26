const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
    {
        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Country",
            required: false
        },
        pursue: [{
            type: String,
            enum: ['Undergraduate', 'Graduate', 'PHD', 'Certificate Program'],
            required: false
        }],
        year: [{
            type: String,
            required: false
        }],
        intake: [{
            type: String,
            enum: ['Current Dec - Mar', 'Apr - Jul', 'Aug - Nov', 'Upcoming Dec - Mar'],
            required: false
        }],
        duration: [{
            type: String,
            enum: ['less than 1 Year', '1-2 year', '3-4 year', 'more than 4 year'],
            required: false
        }],
        courses: [{
            type: String,
            required: true
        }],
        tutionFee: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            enum: ["$", "CAD$", "£", "€", "AUD$", "NZD$", "SGD$", "AED",],
            default: "$"
        },
        admissionRequirement: [{
            type: String,
            enum: ['GRE/GMAT', 'DUOLINGO', 'SAT', 'IELTS', 'TOEFL', 'PTE', 'EXEMPT'],
            required: false
        }],
        highestQualification: {
            type: String,
            enum: ['Higher Secondary', 'Undergraduate', 'Graduate', 'Certificate Program'],
            required: false
        },
        scholarAvailability: {
            type: String,
            enum: ['Full Scholarships', 'Partial Scholarships', 'No Scholarships'],
            required: false
        },
        language: {
            type: String,
            required: false
        },
        name: {
            type: String,
            required: false
        },
        rating: {
            type: Number,
            required: false,
            default: 0
        },
        webLink: {
            type: String,
            required: false,
            default: null
        },
        qsRanking: {
            type: Number,
            required: false,
            default: 0
        },
        image: {
            type: String,
            required: false,
            default: null
        },
        createdBy: {
            type: mongoose.Types.ObjectId,
            ref: 'Staff',
            required: true
        },
        updatedBy: {
            type: mongoose.Types.ObjectId,
            ref: 'Staff',
            required: false,
            default: null
        },
    },
    {
        timestamps: true
    }
);


const University = mongoose.model('University', universitySchema);
module.exports = University;