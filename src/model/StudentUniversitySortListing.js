const mongoose = require("mongoose");

const StudentUniversitySortListingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    counsellorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    university: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
    },

    course: {
      type: String,
      required: true,
    },

    status: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Student",
    },
  },
  {
    timestamps: true,
  }
);

const StudentUniversitySortListing = mongoose.model(
  "StudentUniversitySortListing",
  StudentUniversitySortListingSchema
);

module.exports = StudentUniversitySortListing;
