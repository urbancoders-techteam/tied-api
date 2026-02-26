const mongoose = require("mongoose");

const facultyAttendanceSchema = new mongoose.Schema({
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff"
    },
    loginDateAndTime: {
        type: Date
    },
    isPresent: {
        type: Boolean,
    }
})

const FacultyAttendance = mongoose.model("FacultyAttendance", facultyAttendanceSchema);
module.exports = FacultyAttendance;