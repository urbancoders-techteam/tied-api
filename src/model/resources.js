const mongoose = require("mongoose");

const ResourcesSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    document: {
      type: String,
      required: true,
    },
    resourcesType: {
      type: String,
      enum: ["LOR", "SOP/Essay", "CV", "Resume", "Other"],
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
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Resources = mongoose.model("Resources", ResourcesSchema);
module.exports = Resources;
