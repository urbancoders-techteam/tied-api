const mongoose = require('mongoose');

const universityFinderLeadsSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: Number, required: true },
        countryId: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Country",
            required: false,
            default: []
        }],
        courses: {
            type: String,
            required: true
        },
        pursue: {
            type: String,
            enum: ['Undergraduate', 'Graduate', 'PHD', 'Certificate Program'],
            required: false,
            default: null
        },
        year: [{
            type: String,
            required: false,
            default: []
        }],
        tutionFee: {
            type: Number,
            required: false,
            default: 0
        },
        duration: [{
            type: String,
            enum: ['less than 1 Year', '1-2 year', '3-4 year', 'more than 4 year'],
            required: false,
            default: []
        }],
        intake: [{
            type: String,
            enum: ['Current Dec - Mar', 'Apr - Jul', 'Aug - Nov', 'Upcoming Dec - Mar'],
            required: false,
            default: []
        }],
        admissionRequirement: [{
            type: String,
            enum: ['GRE/GMAT', 'DUOLINGO', 'SAT', 'IELTS', 'TOEFL', 'PTE', 'EXEMPT'],
            required: false,
            default: []
        }],
        scholarAvailability: [{
            type: String,
            enum: ['Full Scholarships', 'Partial Scholarships', 'No Scholarships'],
            required: false,
            default: []
        }],
        highestQualification: {
            type: String,
            enum: ['Higher Secondary', 'Undergraduate', 'Graduate', 'Certificate Program'],
            required: false,
            default: null
        },
        language: {
            type: String,
            required: false,
            default: null
        },
        rating: {
            type: Number,
            required: false,
            default: 0
        },
        type: {
            type: String,
            required: false,
            default: 'Submit'
        },
        status: {
            type: Boolean,
            default: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: false,
            default: null
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: false,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const UniversityFinderLead = mongoose.model('UniversityFinderLead', universityFinderLeadsSchema)
module.exports = UniversityFinderLead;