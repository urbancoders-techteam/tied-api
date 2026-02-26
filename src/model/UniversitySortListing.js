const mongoose = require("mongoose");

const UniversitySortListingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    counsellorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    universityIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "University",
        required: true,
      },
    ],

    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldOfInterest",
      required: true,
    },

    // Optional fields
    programWebsiteLink: { type: String },
    duration: { type: String },

    // New fields from your list
    sopLorEssayStatus: { type: String },
    applicationOpeningDate: { type: String },
    applicationDeadlines: { type: String },
    applicationEntryDate: { type: String },
    greGmatSatRequirement: { type: String },
    greGmatSatMinScore: { type: String },
    englishProficiencyTest: { type: String },
    workExperienceRequirement: { type: String },
    minWorkExperience: { type: String },
    internshipsConsidered: { type: String, enum: ["Yes", "No"] },
    internshipInPreferredFields: { type: String },
    tuitionFee: { type: String },
    lorsRequired: { type: String, enum: ["Yes", "No"] },
    noOfLOR: { type: String },
    lorType: { type: String },
    sopRequired: { type: String, enum: ["Yes", "No"] },
    sopWordLimit: { type: String },
    additionalEssaysRequired: { type: String, enum: ["Yes", "No"] },
    additionalEssaysTopic: { type: String },
    resumeRequired: { type: String, enum: ["Yes", "No"] },
    portfolioRequired: { type: String, enum: ["Yes", "No"] },
    apsRequired: { type: String, enum: ["Yes", "No"] },
    interviewRequired: { type: String, enum: ["Yes", "No"] },
    interviewMode: { type: String },
    applicationFee: { type: String },
    onlineApplicationLink: { type: String },
    livingExpenses: { type: String },
    offerLetterStatus: { type: String },
    typeOfOfferLetter: { type: String },
    conditionalOfferLetter: { type: String, enum: ["Yes", "No"] },
    conditionalOfferLetterAcceptanceDt: { type: String },
    unconditionalOfferLetter: { type: String, enum: ["Yes", "No"] },
    unconditionalOfferLetterAcceptanceDt: { type: String },
    scholarshipsDetails: { type: String },
    scholarshipAmount: { type: String },
    universityContactEmail: { type: String },
    admissionServiceRemark: { type: String },

    // Already existing fields
    marksCriteria: { type: String },
    testRequirement: { type: String },
    workExpRequirement: { type: String },
    location: { type: String },
    intake: { type: String },
    applicationDeadline: { type: String },
    feesStructure: { type: String },
    scholarshipDetails: { type: String },
    remarks: { type: String },

    status: {
      type: Boolean,
      default: true,
    },

    shortlist: {
      type: Boolean,
      default: false,
    },

    countryScholarship: {
      type: String,
    },
    universityScholarship: {
      type: String,
    },
    otherScholarship: {
      type: String,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "createdByModel",
    },
    createdByModel: {
      type: String,
      required: true,
      enum: ["Staff", "Student"],
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

const UniversitySortListing = mongoose.model(
  "UniversitySortListing",
  UniversitySortListingSchema
);

module.exports = UniversitySortListing;
