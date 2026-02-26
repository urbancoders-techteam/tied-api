const mongoose = require("mongoose");

const whySchema = new mongoose.Schema({
  insideTitle: { type: String, maxlength: 100 },
  outsideTitle: String,
});

const feeStructureSchema = new mongoose.Schema({
  nationality: String,
  file: String, // S3 URL after upload
});

const locationSchema = new mongoose.Schema({
  name: String,
  shortDescription: String,
  image: String,
  locationFeatures: [String],
});

const knowMoreSchema = new mongoose.Schema({
  label: { type: String, required: true },
  url: { type: String, required: true },
  image: { type: String },
});

const indianUniversitySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    bgBanner: { type: String, required: true },
    location: String,
    founded: String,
    type: String,
    totalEnrollment: String,
    internationalStudents: String,
    website: String,
    websiteUrl: String,

    locationDetails: locationSchema,

    why: [whySchema],
    feeStructure: [feeStructureSchema],
    knowMore: [knowMoreSchema],

    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: { type: mongoose.Types.ObjectId, ref: "Staff", required: true },
    updatedBy: { type: mongoose.Types.ObjectId, ref: "Staff" },
  },
  { timestamps: true }
);

const IndianUniversity = mongoose.model(
  "IndianUniversity",
  indianUniversitySchema
);
module.exports = IndianUniversity;
