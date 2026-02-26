const mongoose = require("mongoose");
const Permission = require("../model/permission");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");

// SECTION: Create or Update Permissions
exports.createPermission = async (req, res) => {
  try {
    const { roleId, permission } = req.body;
    const createdBy = req?.meta?._id;

    if (!roleId || !Array.isArray(permission)) {
      return sendResponse(res, 400, null, Messages.INVALID_INPUT);
    }

     // Validate roleId
     if (!mongoose.isValidObjectId(roleId)) {
        return sendResponse(res, 400, null, Messages.INVALID_ROLE_ID);
      }
    // Check if any routeId is invalid
    const invalidPermission = permission.find(
      (ele) => !mongoose.isValidObjectId(ele.routeId)
    );

    if (invalidPermission) {
      return sendResponse(res, 400, null, Messages.INVALID_ROUTE_ID);
    }

    const permissionEntries = permission.map((ele) => ({
      roleId,
      createdBy,
      ...ele,
    }));

    await Permission.deleteMany({ roleId });
    await Permission.insertMany(permissionEntries);

    return sendResponse(res, 200, null, Messages.PERMISSION_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Get Permission by Role ID
exports.getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const permissions = await Permission.find({
      roleId: id,
      status: true,
    })
      .populate("routeId", "_id title path icon parent menuMaster")
      .lean();

    if (!permissions || permissions.length === 0) {
      return sendResponse(res, 200, [], Messages.DATA_RETRIVED);
    }

    const data = permissions.map((item) => ({
      _id: item.routeId?._id,
      title: item.routeId?.title ?? null,
      path: item.routeId?.path ?? null,
      icon: item.routeId?.icon ?? null,
      parent: item.routeId?.parent ?? null,
      menuMaster: item.routeId?.menuMaster ?? null,
      add: item?.add ?? false,
      view: item?.view ?? false,
      edit: item?.edit ?? false,
      delete: item?.delete ?? false,
    }));

    return sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
