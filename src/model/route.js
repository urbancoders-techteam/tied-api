const mongoose = require("mongoose");
const AdminRoutesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    parent: {
      type: String,
      required: false,
      default: null,
    },
    menuMaster: {
      type: String,
      required: false,
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "Staff",
     required:true,
    },
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "Staff",
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AdminRoute = mongoose.model("adminRoutes", AdminRoutesSchema);
module.exports = AdminRoute;
