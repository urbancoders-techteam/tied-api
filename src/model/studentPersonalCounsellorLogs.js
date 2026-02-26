const mongoose = require("mongoose");

const studentPersonalCounsellorLogsSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    counsellorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const StudentPersonalCounsellorLogs = mongoose.model(
  "StudentPersonalCounsellorLogs",
  studentPersonalCounsellorLogsSchema
);
module.exports = StudentPersonalCounsellorLogs;
