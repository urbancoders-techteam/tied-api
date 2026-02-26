const mongoose = require("mongoose");

const PsychometricTestSchema = new mongoose.Schema(
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

    testReport: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },

    reportStatus: {
      type: String,
      enum: ["Approved", "Pending", "Not Approved"],
      default: "Pending",
    },
    remark: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PsychometricTest = mongoose.model(
  "PsychometricTest",
  PsychometricTestSchema
);

module.exports = PsychometricTest;
