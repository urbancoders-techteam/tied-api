const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
    },
    title: {
      type: String,
    },
    items: {
      type: [String],
    },
    topColor: {
      type: String,
    },
    packagePrice: {
      type: Number,
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

const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;
