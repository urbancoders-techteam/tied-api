const mongoose = require('mongoose');

const userAttendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    isAttend: { type: Boolean, default: false },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    markedDate: { type: Date }
})

const UserAttendance = mongoose.model('UserAttendance', userAttendanceSchema)
module.exports = UserAttendance;