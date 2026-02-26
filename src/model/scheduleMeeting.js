const mongoose = require("mongoose");

const scheduleMeetingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    scheduleStatus: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending",
      },
    status: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: false,
      default:null,
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

const ScheduleMeeting = mongoose.model(
  "ScheduleMeeting",
  scheduleMeetingSchema
);
module.exports = ScheduleMeeting;
