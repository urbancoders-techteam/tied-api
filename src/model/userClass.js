const mongoose = require('mongoose');

const userClassSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    classDate: {
        type: String
    },
    joinTime: {
        type: String
    },
    isClassAttend: {
        type: Boolean,
        default: false
    },
    classDuration: {
        type: String
    }
});

const UserClass = mongoose.model('UserClass', userClassSchema);
module.exports = UserClass;