const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    learningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningResource",
    },
    practiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeAssignment",
    },
    duration: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    meetingLink: {
      type: String,
      required: true,
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
  {
    timestamps: true,
  }
);

const Class = mongoose.model("Class", classSchema);
module.exports = Class;
