const mongoose = require("mongoose");

// Schema for document details
const documentDetailsSchema = new mongoose.Schema(
  {
    document: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Subdocument Schemas for various categories
const AcademicDocumentsSchema = new mongoose.Schema(
  {
    class10Marksheet: { type: documentDetailsSchema, required: false, default: null },
    class12Marksheet: { type: documentDetailsSchema, required: false, default: null },
    bachelorsSemesterWiseMarksheet: {
      type: documentDetailsSchema,
      required: false,
      default: null,
    },
    bachelorsDegreeCertificate: { type: documentDetailsSchema, required: false, default: null },
    mastersSemesterWiseMarksheet: {
      type: documentDetailsSchema,
      required: false,
      default: null,
    },
    mastersDegreeCertificate: { type: documentDetailsSchema, required: false, default: null },
    backlogCertificate: { type: documentDetailsSchema, required: false, default: null },
    schoolLeavingCertificate: { type: documentDetailsSchema, required: false, default: null },
    others: { type: documentDetailsSchema, required: false, default: null },
  },
  { _id: false }
);

const StandardisedTestScoresSchema = new mongoose.Schema(
  {
    ielts_toefl_pte_duolingo: { type: documentDetailsSchema, required: false, default: null },
    graduateRecordExamination: { type: documentDetailsSchema, required: false, default: null },
    graduateManagementAdmissionTest: {
      type: documentDetailsSchema,
      required: false,
      default: null,
    },
    sat_Act: { type: documentDetailsSchema, required: false, default: null },
    lawSchoolAdmissionTest: { type: documentDetailsSchema, required: false, default: null },
    medicalCollegeAdmissionTest: { type: documentDetailsSchema, required: false, default: null },
    others: { type: documentDetailsSchema, required: false, default: null },
  },
  { _id: false }
);

const ApplicationDocumentsSchema = new mongoose.Schema(
  {
    statementOfPurpose: { type: documentDetailsSchema, required: false, default: null },
    lettersOfRecommendationOne: { type: documentDetailsSchema, required: false, default: null },
    lettersOfRecommendationTwo: { type: documentDetailsSchema, required: false, default: null },
    lettersOfRecommendationThree: { type: documentDetailsSchema, required: false, default: null },
    resume: { type: documentDetailsSchema, required: false, default: null },
    essays: { type: documentDetailsSchema, required: false, default: null },
    portfolio: { type: documentDetailsSchema, required: false, default: null },
    researchProposal: { type: documentDetailsSchema, required: false, default: null },
    others: { type: documentDetailsSchema, required: false, default: null },
  },
  { _id: false }
);

const IdentityDocumentsSchema = new mongoose.Schema(
  {
    passport: { type: documentDetailsSchema, required: false, default: null },
    passportSizePhotograph: { type: documentDetailsSchema, required: false, default: null },
    birthCertificate: { type: documentDetailsSchema, required: false, default: null },
    others: { type: documentDetailsSchema, required: false, default: null },
  },
  { _id: false }
);

const FinancialDocumentsSchema = new mongoose.Schema(
  {
    bankStatements: { type: documentDetailsSchema, required: false, default: null },
    loanApprovalLetter: { type: documentDetailsSchema, required: false, default: null },
    scholarshipLetter: { type: documentDetailsSchema, required: false, default: null },
    incomeTaxReturnsOrForm16: { type: documentDetailsSchema, required: false, default: null },
    sponsorshipLetter: { type: documentDetailsSchema, required: false, default: null },
    others: { type: documentDetailsSchema, required: false, default: null },
  },
  { _id: false }
);

const AdditionalDocumentsSchema = new mongoose.Schema(
  {
    workExperienceCertificates: { type: documentDetailsSchema, required: false, default: null },
    internshipCertificates: { type: documentDetailsSchema, required: false, default: null },
    extracurricularAchievementCertificates: {
      type: documentDetailsSchema,
      required: false,
      default: null,
    },
    languageProficiencyCertificate: {
      type: documentDetailsSchema,
      required: false,
      default: null,
    },
    medicalCertificate: { type: documentDetailsSchema, required: false, default: null },
    affidavitOfFinancialSupport: { type: documentDetailsSchema, required: false, default: null },
    others: { type: documentDetailsSchema, required: false, default: null },
  },
  { _id: false }
);

// Main Student Document Management Schema
const StudentDocumentManagementSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    academicDocuments: {
      type: AcademicDocumentsSchema,
      required: false,
      default: null,
    },
    standardisedTestScores: {
      type: StandardisedTestScoresSchema,
      required: false,
      default: null,
    },
    applicationDocuments: {
      type: ApplicationDocumentsSchema,
      required: false,
      default: null,
    },
    identityDocuments: {
      type: IdentityDocumentsSchema,
      required: false,
      default: null,
    },
    financialDocuments: {
      type: FinancialDocumentsSchema,
      required: false,
      default: null,
    },
    additionalDocuments: {
      type: AdditionalDocumentsSchema,
      required: false,
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
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

const StudentDocumentManagement = mongoose.model(
  "StudentDocumentManagement",
  StudentDocumentManagementSchema
);

module.exports = StudentDocumentManagement;
