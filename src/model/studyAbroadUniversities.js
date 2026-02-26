const mongoose = require("mongoose");

const whySchema = new mongoose.Schema({
  insideTitle: { type: String, maxlength: 100 },
  outsideTitle: String,
});

const feeStructureSchema = new mongoose.Schema({
  courses: String,
  eligibilityCriteria: String,
  englishProficiencyTest: String,
  approximateAnnualFees: String,
});

const ScholarShipSchema = new mongoose.Schema({
  scholarshipName: { type: String, required: true },
  scholarshipContent: [{ type: String }],
});

const knowMoreSchema = new mongoose.Schema({
  label: { type: String, required: true },
  url: { type: String, required: true },
  image: { type: String },
});

// ✅ Popular Recruiters Schema
const popularRecruiterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, required: true },
});

const studyAbroadUniversitySchema = new mongoose.Schema(
  {
    countryName: { type: String, required: true },
    image: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    universitySortName: { type: String, required: false },
    description: { type: String, required: true },
    bgBanner: { type: String, required: true },
    location: String,
    type: String,
    totalEnrollment: String,
    indianStudents: String,
    totalStudents: String,
    website: String,
    websiteUrl: String,
    why: [whySchema],
    feeStructure: [feeStructureSchema],
    scholarShip: [ScholarShipSchema],
    knowMore: [knowMoreSchema],
    popularRecruiters: [popularRecruiterSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: { type: mongoose.Types.ObjectId, ref: "Staff", required: true },
    updatedBy: { type: mongoose.Types.ObjectId, ref: "Staff" },
  },
  { timestamps: true }
);

const StudyAbroadUniversity = mongoose.model(
  "StudyAbroadUniversity",
  studyAbroadUniversitySchema
);
module.exports = StudyAbroadUniversity;
