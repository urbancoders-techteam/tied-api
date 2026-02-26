const mongoose = require('mongoose');

const information = new mongoose.Schema({
    firstName: {
        type: String,
    },
    lastName: {
        type: String,
    },
    dob: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'others']
    },
})

const academicBackground = new mongoose.Schema({
    academic: {
        type: String,
    },
    marks: {
        type: String,
    },
    yearOfPassing: {
        type: String,
    },
    degree: {
        type: String,
    },
    college: {
        type: String,
    },
    university: {
        type: String,
    },
});

const workExperience = new mongoose.Schema({
    companyName: {
        type: String,
    },
    designation: {
        type: String,
    },
    duration: {
        type: String,
    },
});

const studentDetail = new mongoose.Schema({
    studentEmail: {
        type: String,
    },
    mobileNumber: {
        type: Number,
    },
    guardianName: {
        type: String,
    },
    guardianMobileNumber: {
        type: Number,
    },
});

const permanentAddress = new mongoose.Schema({
    address: {
        type: String,
    },
    state: {
        type: String,
    },
    city: {
        type: String,
    },
    pincode: {
        type: Number,
    },
});

const mailingAddress = new mongoose.Schema({
    address: {
        type: String,
    },
    state: {
        type: String,
    },
    city: {
        type: String,
    },
    pincode: {
        type: Number,
    },
})

const course = new mongoose.Schema({
    courseName: {
        type: String,
        required: true,
        enum: ['GRE', 'GMAT', 'SAT', 'IELTS', 'PTE', 'TOEFL', 'OTHERS']
    },
    fullCourse: {
        type: Boolean,
        default: false
    },
    mockTest: {
        type: Boolean,
        default: false
    },
    fee: {
        type: Number,
        default: 0
    }

});

const friendsName = new mongoose.Schema({
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
})


const enrollementSchema = new mongoose.Schema({
    information: {
        type: information,
    },
    academicBackground: [{
        type: academicBackground,
    }],
    workExperience: [{
        type: workExperience,
    }],
    studentDetail: {
        type: studentDetail,
    },
    permanentAddress: {
        type: permanentAddress
    },
    mailingAddress: {
        type: mailingAddress
    },
    taksheelaKnowAbout: {
        type: String
    },
    newsPaper: {
        type: String
    },
    internetAt: {
        type: String
    },
    course: [{
        type: course
    }],
    friendsName: [{
        type: friendsName
    }],
    iAgree: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    filledBy: {
        type: String,
        enum: ["admin", "user"],
    }
},
    {
        timestamps: true
    }
);

const EnrollementForm = mongoose.model('EnrollementForm', enrollementSchema)

module.exports = EnrollementForm;