const mongoose = require("mongoose");

const examStatusSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
  },
  { timestamps: true }
);

const ExamStatus = mongoose.model("ExamStatus", examStatusSchema);
module.exports = ExamStatus;

 