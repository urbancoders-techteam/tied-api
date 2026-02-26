const mongoose = require("mongoose");

const AcademicDocumentsSchema = new mongoose.Schema(
  {
    class10Marksheet: { type: Boolean, default: false },
    class12Marksheet: { type: Boolean, default: false },
    bachelorsSemesterWiseMarksheet: { type: Boolean, default: false },
    bachelorsDegreeCertificate: { type: Boolean, default: false },
    mastersSemesterWiseMarksheet: { type: Boolean, default: false },
    mastersDegreeCertificate: { type: Boolean, default: false },
    backlogCertificate: { type: Boolean, default: false },
    schoolLeavingCertificate: { type: Boolean, default: false },
    others: { type: String, default: false },
  },
  { _id: false }
);

const StandardisedTestScoresSchema = new mongoose.Schema(
  {
    ielts_toefl_pte_duolingo: { type: Boolean, default: false },
    graduateRecordExamination: { type: Boolean, default: false },
    graduateManagementAdmissionTest: { type: Boolean, default: false },
    sat_Act: { type: Boolean, default: false },
    lawSchoolAdmissionTest: { type: Boolean, default: false },
    medicalCollegeAdmissionTest: { type: Boolean, default: false },
    others: { type: String, default: false },
  },
  { _id: false }
);

const ApplicationDocumentsSchema = new mongoose.Schema(
  {
    statementOfPurpose: { type: Boolean, default: false },
    lettersOfRecommendationOne: { type: Boolean, default: false },
    lettersOfRecommendationTwo: { type: Boolean, default: false },
    lettersOfRecommendationThree: { type: Boolean, default: false },
    resume: { type: Boolean, default: false },
    essays: { type: Boolean, default: false },
    portfolio: { type: Boolean, default: false },
    researchProposal: { type: Boolean, default: false },
    others: { type: String, default: false },
  },
  { _id: false }
);

const IdentityDocumentsSchema = new mongoose.Schema(
  {
    passport: { type: Boolean, default: false },
    passportSizePhotograph: { type: Boolean, default: false },
    birthCertificate: { type: Boolean, default: false },
    policeClearanceCertificate: { type: Boolean, default: false },
    others: { type: String, default: false },
  },
  { _id: false }
);

const FinancialDocumentsSchema = new mongoose.Schema(
  {
    bankStatements: { type: Boolean, default: false },
    loanApprovalLetter: { type: Boolean, default: false },
    scholarshipLetter: { type: Boolean, default: false },
    incomeTaxReturnsOrForm16: { type: Boolean, default: false },
    sponsorshipLetter: { type: Boolean, default: false },
    others: { type: String, default: false },
  },
  { _id: false }
);

const AdditionalDocumentsSchema = new mongoose.Schema(
  {
    workExperienceCertificates: { type: Boolean, default: false },
    internshipCertificates: { type: Boolean, default: false },
    extracurricularAchievementCertificates: { type: Boolean, default: false },
    languageProficiencyCertificate: { type: Boolean, default: false },
    medicalCertificate: { type: Boolean, default: false },
    affidavitOfFinancialSupport: { type: Boolean, default: false },
    others: { type: String, default: false },
  },
  { _id: false }
);

const DocumentManagementSchema = new mongoose.Schema(
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

const DocumentManagement = mongoose.model(
  "DocumentManagement",
  DocumentManagementSchema
);

module.exports = DocumentManagement;
