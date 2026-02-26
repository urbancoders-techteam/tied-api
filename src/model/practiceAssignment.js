const mongoose = require("mongoose");

const practiceAssignmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },

    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
  },
  { timestamps: true }
);

const PracticeAssignment = mongoose.model(
  "PracticeAssignment",
  practiceAssignmentSchema
);
module.exports = PracticeAssignment;
