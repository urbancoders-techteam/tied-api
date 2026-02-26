const mongoose = require("mongoose");
const adminRoutes = require("../model/route.js");
const { getCurrentISTTime } = require("../helper/lib");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");


//SECTION - Create admin route
exports.createAdminRoute = async (req, res) => {
  try {
    const { title, path, icon, parent, menuMaster } = req.body;

    if (!title || !path || !icon) {
      throw new Error("Title, Path, and Icon are required");
    }

    const titleRegex = new RegExp(`^${title}$`, "i");
    const existingRoute = await adminRoutes.findOne({ title: { $regex: titleRegex } });

    if (existingRoute) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_TITLE);
    }

    await adminRoutes.create({
      title,
      path,
      icon,
      parent,
      menuMaster,
      status: true,
      createdBy: req?.meta?._id,
      createdAt: getCurrentISTTime(),
    });

    return sendResponse(res, 200,null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Get All Admin Routes
exports.getAllAdminRoutes = async (req, res) => {
  try {
    const routes = await adminRoutes
      .find()
      .populate({ path: "createdBy", select: "name" })
      .sort({ _id: 1 })
      .lean()
      .exec();

    const formattedRoutes = routes.map((route) => ({
      _id: route._id,
      title: route.title,
      path: route.path,
      icon: route.icon,
      parent: route.parent,
      menuMaster: route.menuMaster,
      status: route.status,
      createdBy: route?.createdBy?.name ?? null,
      createdAt: route?.createdAt ?? null,
    }));

    return sendResponse(res, 200, formattedRoutes, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - delete Route
exports.deleteAdminRoute = async (req, res) => {
  try {
    const { id } = req.params;

  if (!id || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }


    const deletedRoute = await adminRoutes.findByIdAndDelete(id);

    if (!deletedRoute) {
     return sendResponse(res, 400, null,Messages.NOT_FOUND_DATA("Admin Route"));
    }

    return sendResponse(res, 200,null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

