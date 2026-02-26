const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Types.ObjectId,
      ref: "role",
      required: true,
    },
    routeId: {
      type: mongoose.Types.ObjectId,
      ref: "adminRoutes",
      required: true,
    },
    add: {
      type: Boolean,
      required: true,
    },
    view: {
      type: Boolean,
      required: true,
    },
    edit: {
      type: Boolean,
      required: true,
    },
    delete: {
      type: Boolean,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "Staff",
      required:false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Permission = mongoose.model("Permission", PermissionSchema);
module.exports = Permission;
