const mongoose = require("mongoose");

const personalCounsellorSchema = new mongoose.Schema(
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
    meetingLink: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    isReschedule: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    isMarkAsDone: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const PersonalCounsellor = mongoose.model(
  "PersonalCounsellor",
  personalCounsellorSchema
);
module.exports = PersonalCounsellor;
