const mongoose = require("mongoose");

// ✅ Schema for answers with upload files
const dataSchema = new mongoose.Schema({
  questionNumber: { type: Number },
  questionType: { type: String, enum: ["mcq", "msq", "text field"] },
  answers: [{ type: String }],
  uploadFiles: [{ type: String }], // ✅ save S3 URLs
  correct: { type: Boolean, default: false },
  unanswered: { type: Boolean, default: false },
  incorrect: { type: Boolean, default: false },
});

// ✅ Schema for writing answers
const writingData = new mongoose.Schema({
  passageNumber: { type: Number },
  answers: { type: String },
  uploadFiles: [{ type: String }], // ✅ save S3 URLs
  numberOfWord: { type: Number },
});

const userTestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: "MockTest" },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    isMockTestComplete: { type: Boolean, default: false },
    isTestComplete: { type: Boolean, default: false },
    isTestChecked: { type: Boolean, default: false },

    reading: {
      data: [dataSchema],
      correct: { type: Number, default: 0 },
      unanswered: { type: Number, default: 0 },
      incorrect: { type: Number, default: 0 },
      obtainMarks: {
        type: Number,
        default: 0,
        min: [0, "Marks cannot be negative"],
        max: [100, "Marks cannot exceed 100"], // optional limit
        validate: {
          validator: Number.isFinite,
          message: "Marks must be a valid number",
        },
      },
      totalMarks: { type: Number, default: 0 },
      submitDateTime: { type: Date },
      facultyFeedback: { type: String, default: null },
      answerKeyUrl: { type: String, default: null },

      checkerId: { type: mongoose.Types.ObjectId, ref: "Staff" },
      isTestComplete: {
        type: String,
        enum: ["checked", "pending"],
        default: null,
      },
    },

    writing: {
      data: [writingData],
      obtainMarks: {
        type: Number,
        default: 0,
        min: [0, "Marks cannot be negative"],
        max: [100, "Marks cannot exceed 100"], // optional limit
        validate: {
          validator: Number.isFinite,
          message: "Marks must be a valid number",
        },
      },

      totalMarks: { type: Number, default: 0 },
      checkerId: { type: mongoose.Types.ObjectId, ref: "Staff" },
      facultyFeedback: { type: String, default: null },
      answerKeyUrl: { type: String, default: null },

      submitDateTime: { type: Date },
      isTestComplete: {
        type: String,
        enum: ["checked", "pending"],
        default: null,
      },
    },

    listening: {
      data: [dataSchema],
      correct: { type: Number, default: 0 },
      unanswered: { type: Number, default: 0 },
      incorrect: { type: Number, default: 0 },
      obtainMarks: {
        type: Number,
        default: 0,
        min: [0, "Marks cannot be negative"],
        max: [100, "Marks cannot exceed 100"], // optional limit
        validate: {
          validator: Number.isFinite,
          message: "Marks must be a valid number",
        },
      },

      totalMarks: { type: Number, default: 0 },
      checkerId: { type: mongoose.Types.ObjectId, ref: "Staff" },
      facultyFeedback: { type: String, default: null },
      answerKeyUrl: { type: String, default: null },

      isTestComplete: {
        type: String,
        enum: ["checked", "pending"],
        default: null,
      },
      submitDateTime: { type: Date },
    },

    aptitude: {
      data: [dataSchema],
      correct: { type: Number, default: 0 },
      unanswered: { type: Number, default: 0 },
      incorrect: { type: Number, default: 0 },
      obtainMarks: {
        type: Number,
        default: 0,
        min: [0, "Marks cannot be negative"],
        max: [100, "Marks cannot exceed 100"], // optional limit
        validate: {
          validator: Number.isFinite,
          message: "Marks must be a valid number",
        },
      },

      totalMarks: { type: Number, default: 0 },
      checkerId: { type: mongoose.Types.ObjectId, ref: "Staff" },
      facultyFeedback: { type: String, default: null },
      answerKeyUrl: { type: String, default: null },

      isTestComplete: {
        type: String,
        enum: ["checked", "pending"],
        default: null,
      },
      submitDateTime: { type: Date },
    },

    speaking: {
      data: [dataSchema],
      correct: { type: Number, default: 0 },
      unanswered: { type: Number, default: 0 },
      incorrect: { type: Number, default: 0 },
      obtainMarks: {
        type: Number,
        default: 0,
        min: [0, "Marks cannot be negative"],
        max: [100, "Marks cannot exceed 100"], // optional limit
        validate: {
          validator: Number.isFinite,
          message: "Marks must be a valid number",
        },
      },

      totalMarks: { type: Number, default: 0 },
      checkerId: { type: mongoose.Types.ObjectId, ref: "Staff" },
      facultyFeedback: { type: String, default: null },
      answerKeyUrl: { type: String, default: null },

      isTestComplete: {
        type: String,
        enum: ["checked", "pending"],
        default: null,
      },
      submitDateTime: { type: Date },
    },
  },
  { timestamps: true }
);

const UserTest = mongoose.model("UserTest", userTestSchema);
module.exports = UserTest;
