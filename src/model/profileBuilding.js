const mongoose = require("mongoose");

const AcademicPreparationSchema = new mongoose.Schema({
  tenthOverallAggregate: {
    type: Number,
    require: true,
  },

  twelfthOverallAggregate: {
    type: Number,
    require: true,
  },
  graduationCgpa: {
    type: Number,
    require: false,
    default: null,
  },
  relevantCompletedCourses: {
    type: String,
    require: false,
    default: null,
  },
  professionalDegrees: {
    type: String,
    require: false,
    default: null,
  },
  honoursAndAwards: {
    type: String,
    require: false,
    default: null,
  },
  others: {
    type: String,
    require: false,
    default: null,
  },
});

const ResearchProjectsSchema = new mongoose.Schema({
  researchProjects: {
    type: String,
    require: false,
    default: null,
  },
  publications: {
    type: String,
    require: false,
    default: null,
  },
  researchAssistantships: {
    type: String,
    require: false,
    default: null,
  },
});

const WorkExperienceSchema = new mongoose.Schema({
  fullTimeJobExperience: {
    type: String,
    require: false,
    default: null,
  },
  internships: {
    type: String,
    require: false,
    default: null,
  },

  partTimeJobs: {
    type: String,
    require: false,
    default: null,
  },
  professinalCertifications: {
    type: String,
    require: false,
    default: null,
  },
});

const ExtracurricularActivitiesSchema = new mongoose.Schema({
  sports: {
    type: String,
    require: false,
    default: null,
  },
  musicAndDance: {
    type: String,
    require: false,
    default: null,
  },
  arts: {
    type: String,
    require: false,
    default: null,
  },
  competitionAndEvents: {
    type: String,
    require: false,
    default: null,
  },

  participationInClubsAndSocieties: {
    type: String,
    require: false,
    default: null,
  },
  communityServices: {
    type: String,
    require: false,
    default: null,
  },
});
const SkillsAndCompetenciesSchema = new mongoose.Schema({
  leadershipRoles: {
    type: String,
    require: false,
    default: null,
  },
  technicalSkills: {
    type: String,
    require: false,
    default: null,
  },
  softSkills: {
    type: String,
    require: false,
    default: null,
  },
  languageSkills: {
    type: String,
    require: false,
    default: null,
  },
});

const OnlinePresenceSchema = new mongoose.Schema({
  linkedInProfile: {
    type: String,
    require: false,
    default: null,
  },
  personalWebsite: {
    type: String,
    require: false,
    default: null,
  },
  professionalSocialMedia: {
    type: String,
    require: false,
    default: null,
  },
});

const ProfileBuildingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    city: {
      type: String,
      require: true,
    },
    institute: {
      type: String,
      required: true,
    },
    currentCourse: {
      type: String,

      required: true,
    },
    intake: {
      type: String,
      require: false,
      default: null,
    },
    careerGoal: {
      type: String,
      required: true,
    },

    academicPreparation: {
      type: AcademicPreparationSchema,
      required: true,
    },
    researchExperience: {
      type: ResearchProjectsSchema,
      require: false,
      default: null,
    },
    projects: {
      type: String,
      require: false,
      default: null,
    },
    workExperience: {
      type: WorkExperienceSchema,
      require: false,
      default: null,
    },
    extracurricularActivites: {
      type: ExtracurricularActivitiesSchema,
      require: false,
      default: null,
    },
    skillsAndCompetencies: {
      type: SkillsAndCompetenciesSchema,
      require: false,
      default: null,
    },
    onlinePresence: {
      type: OnlinePresenceSchema,
      require: false,
      default: null,
    },
    financialPosition: {
      type: String,
      require: false,
      default: null,
    },
    proofOfWork: {
      type: String,
      default: null,
      required: false,
    },
    resume: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    remark: { type: String },
    timeline: { type: Date },

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

const ProfileBuilding = mongoose.model(
  "ProfileBuilding",
  ProfileBuildingSchema
);

module.exports = ProfileBuilding;
