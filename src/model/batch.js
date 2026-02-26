const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    tests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Test" }],
    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true,
      },
    ],

    mockTests: [{ type: mongoose.Schema.Types.ObjectId, ref: "MockTest" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
  },
  { timestamps: true }
);

const Batch = mongoose.model("Batch", batchSchema);
module.exports = Batch;
