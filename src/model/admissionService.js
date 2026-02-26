const mongoose = require("mongoose");

const AdmissionServiceSchema = new mongoose.Schema(
  {
    sortlistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversitySortListing",
      required: true,
      unique: true,
    },
    SOP: { type: String },
    LOR: { type: String },
    ESSAYS: { type: String },

    fillingApplication: {
      offerReceived: { type: String },
      appliedDate: { type: String },
      appliedTime: { type: String },
      applicationAmount: { type: String },
      appliedVia: { type: String },
    },
    conditionalOfferLetter: {
      offerReceived: { type: String },
      receivedDate: { type: String },
      receivedTime: { type: String },
      file: { type: String },
    },
    unconditionalOfferLetter: {
      offerReceived: { type: String },
      receivedDate: { type: String },
      receivedTime: { type: String },
      file: { type: String },
    },
    scholarshipApplication: {
      offerReceived: { type: String },
      receivedDate: { type: String },
      receivedTime: { type: String },
      file: { type: String },
    },
    feedback: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  },
  { timestamps: true }
);

// 👇 Add this line to register the model correctly
const AdmissionService = mongoose.model(
  "AdmissionService",
  AdmissionServiceSchema
);

module.exports = AdmissionService;
