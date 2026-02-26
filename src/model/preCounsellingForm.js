const mongoose = require('mongoose');

const personalDetail = new mongoose.Schema({
    name: {
        type: String,
    },
    address: {
        type: String,
    },
    mobileNumber: {
        type: Number,
    },
    email: {
        type: String,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
})

const preCounsellingFormSchema = new mongoose.Schema({
    personalDetails: {
        type: personalDetail
    },
    countries: [{
        type: String
    }],
    testPreparation: {
        type: String,
        enum: ['GMAT', 'GRE', 'SAT', 'IELTS', 'TOEFL', 'PTE', 'OTHERS']
    },
    course: {
        type: String,
    },
    universities: {
        type: String,
    },
    hereAboutUs: {
        type: String,
        enum: ['Friends', 'Website']
    },
    date: {
        type: Date,
    },
    signture: {
        type: String
    }
},
    {
        timestamps: true
    }
)

const PreCounsellingForm = mongoose.model('PreCounsellingForm', preCounsellingFormSchema)

module.exports = PreCounsellingForm;