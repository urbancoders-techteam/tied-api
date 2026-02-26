const mongoose = require("mongoose");
const Document = new mongoose.Schema({
  url: {
    type: String,
    required: false,
  },
});

//Define Personalized Mentoring schema
const PersonalizedMentoringSchema = new mongoose.Schema({
  psychometricTest: {
    type: Boolean,
    required: false,
    default: false,
  },
  psychometricTestAssignDate: {
    type: Date,
    required: false,
    default: null,
  },
  psychometricTestUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    requried: false,
    default: null,
  },
});

const StudentSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
    },
    mobile: {
      type: Number,
      default: null,
    },
    password: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    documents: [Document],
    isenrolled: {
      type: Boolean,
      default: false,
    },
    isStudyAbroadApproved: {
      type: Boolean,
      default: false,
    },


       // assign counsellor
    counsellorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    counsellorAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    counsellorAssignedAt: Date,
    
    //NOTE: All the details related study abroad is here
    studyAbroadDetails: {
      isStudyAbroadApproved: {
        type: Boolean,
        default: false,
      },

      //LINK: Personalize Mentoring
      personalizedMentoring: {
        type: PersonalizedMentoringSchema,
        required: false,
        default: null,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      requried: false,
      default: null,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Student", StudentSchema);
