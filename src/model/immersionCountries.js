const mongoose = require("mongoose");

const KeyObjectiveSchema = new mongoose.Schema({
  icon: { type: String, required: true }, // base64 image
  description: { type: String, required: true },
});

const ProgramOverviewSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: [{ type: String }],
});

const ImmersionCountrySchema = new mongoose.Schema(
  {
    immersionZone: {
      type: String,
      required: true,
      enum: ["Middle East", "South East Asia", "Europe"],
    },
    name: { type: String, required: true, unique: true },
    description: { type: String },

    keyObjectives: [KeyObjectiveSchema],
    programOverview: [ProgramOverviewSchema],

    universityTitle: { type: String },
    universityShortDes: { type: String },
    universityFeatures: [{ type: String }],
    universityImage: { type: String },

    companyTitle: { type: String },
    companyShortDes: { type: String },
    companyFeatures: [{ type: String }],
    companyImage: { type: String },

    image: { type: String },
    flag: { type: String },

    culturalExploration: [{ type: String }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ImmersionCountry", ImmersionCountrySchema);
