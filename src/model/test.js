const mongoose = require("mongoose");

const Data = new mongoose.Schema({
  name: {
    type: String,
    default: null,
  },
  pdf: {
    type: String,
    default: null,
  },

  audio: {
    type: String,
    default: null,
  },
  numberOfWord: {
    type: Number,
    default: 0,
  },
  isUploadFiles: { type: Boolean, default: false },
  uploadFiles: [
    {
      type: String,
      default: null,
    },
  ],
});
const question = new mongoose.Schema({
  questionNumber: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    enum: ["mcq", "msq", "text field"],
  },
});

const testSchema = new mongoose.Schema(
  {
    testType: {
      type: String,
      enum: ["MockTest", "LearningResource", "PracticeAssignment"],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tests",
      default: null,
    },
    tests: {
      type: String,
      enum: ["MockTest", "LearningResource", "PracticeAssignment", null],
      // required: true
    },
    types: [
      {
        type: String,
        enum: ["reading", "writing", "listening", "speaking", "aptitude"],
      },
    ],
    name: {
      type: String,
      required: true,
    },
    reading: {
      individualQuestions: {
        type: Number,
      },
      duration: {
        type: Number,
        default: 0,
      },
      marks: {
        type: Number,
        default: 0,
      },
      question: [question],
      data: [Data],
    },
    writing: {
      individualQuestions: {
        type: Number,
      },
      duration: {
        type: Number,
        default: 0,
      },
      marks: {
        type: Number,
        default: 0,
      },
      data: [Data],
    },
    speaking: {
      individualQuestions: {
        type: Number,
      },
      duration: {
        type: Number,
        default: 0,
      },
      marks: {
        type: Number,
        default: 0,
      },
      data: [Data],
    },
    listening: {
      individualQuestions: {
        type: Number,
      },
      duration: {
        type: Number,
        default: 0,
      },
      marks: {
        type: Number,
        default: 0,
      },
      question: [question],
      data: [Data],
    },
    aptitude: {
      individualQuestions: {
        type: Number,
      },
      duration: {
        type: Number,
        default: 0,
      },
      marks: {
        type: Number,
        default: 0,
      },
      question: [question],
      data: [Data],
    },
    totalQuestion: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
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
  {
    timestamps: true,
  }
);

const Test = mongoose.model("Test", testSchema);
module.exports = Test;
