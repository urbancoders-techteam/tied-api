const mongoose = require("mongoose");

const regulatoryBodiesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },
    link: {
      type: String,
      required: [true, "Link is required"],
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RegulatoryBodies", regulatoryBodiesSchema);

const RegulatoryBodies = mongoose.model(
  "RegulatoryBodies",
  regulatoryBodiesSchema
);
module.exports = RegulatoryBodies;
