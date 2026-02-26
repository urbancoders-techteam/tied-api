const mongoose = require("mongoose");

const supportStatusEnum = ["Yet to Begin", "Ongoing", "Completed"];

const postEnrollmentSupportSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    educationLoanSupport: {
      opted: {
        type: Boolean,
        default: null,
      },
      status: {
        type: String,
        enum: supportStatusEnum,
        default: null,
      },
    },

    visaSupport: {
      opted: {
        type: Boolean,
        default: null,
      },
      status: {
        type: String,
        enum: supportStatusEnum,
        default: null,
      },
    },

    travelAndForexSupport: {
      opted: {
        type: Boolean,
        default: null,
      },
      status: {
        type: String,
        enum: supportStatusEnum,
        default: null,
      },
    },

    accommodationSupport: {
      opted: {
        type: Boolean,
        default: null,
      },
      status: {
        type: String,
        enum: supportStatusEnum,
        default: null,
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PostEnrollmentSupport = mongoose.model(
  "PostEnrollmentSupport",
  postEnrollmentSupportSchema
);

module.exports = PostEnrollmentSupport;
