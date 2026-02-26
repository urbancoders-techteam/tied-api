const Plan = require("../model/plan");
const Staff = require("../model/staffModel");
const { Messages } = require("../helper/message");
const mongoose = require("mongoose");
const { getCurrentISTTime } = require("../helper/lib");

const { sendResponse } = require("../helper/response");

// SECTION:  Create  Plan (Admin)
exports.createPlan = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id, title, items, topColor, packagePrice } = req.body;

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    if (!id || !title || !items || !topColor || !packagePrice) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELDS);
    }

    const existingPlan = await Plan.findOne({
      $or: [{ id }, { title }],
    });

    if (existingPlan) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }

    await Plan.create({
      id,
      title,
      items,
      topColor,
      packagePrice,
      createdBy: staffId,
      createdAt: getCurrentISTTime(),
      updatedAt: getCurrentISTTime(),
    });

    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Update Plan (Admin)
exports.updatePlan = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const planId = req.params.id;
    const { id, title, items, topColor, packagePrice, status } = req.body;

    if (!mongoose.isValidObjectId(planId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    if (!id || !title || !items || !topColor || !packagePrice) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELDS);
    }

    const existingPlan = await Plan.findOne({
      _id: { $ne: planId },
      $or: [{ id }, { title }],
    });

    if (existingPlan) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }

    await Plan.findByIdAndUpdate(
      planId,
      {
        id,
        title,
        items,
        topColor,
        packagePrice,
        status,
        updatedAt: getCurrentISTTime(),
      },
      { new: true }
    );

    sendResponse(res, 200, null, Messages.DATA_UPDATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION:  Get All Plan (Admin)
exports.getAllPlans = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit, id, title } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const filter = {
      ...(id && { id }),
      ...(title && { title: { $regex: title, $options: "i" } }),
    };

    const count = await Plan.countDocuments(filter);

    const plans = await Plan.find(filter)
      .populate({ path: "createdBy", select: "name" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean()
      .exec();

    const formattedData = plans.map((item) => ({
      _id: item._id,
      id: item.id,
      title: item.title,
      items: item.items,
      topColor: item.topColor,
      packagePrice: item.packagePrice,
      createdBy: item?.createdBy?.name ?? null,
      createdAt: item?.createdAt ?? null,
      updatedAt: item?.updatedAt ?? null,
    }));

    sendResponse(
      res,
      200,
      {
        count,
        plans: formattedData,
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION:  Get  Plan By Id(Admin)
exports.getPlanById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const planId = req.params.id;
    if (!mongoose.isValidObjectId(planId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const plan = await Plan.findById(planId).select(
      "-__v -createdBy -updatedBy -createdAt -updatedAt"
    );

    if (!plan) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    sendResponse(res, 200, plan, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION:  Delete Plan By Id(Admin)
exports.deletePlan = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const planId = req.params.id;

    if (!mongoose.isValidObjectId(planId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }
    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }
    const plan = await Plan.findById(planId);
    if (!plan) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    await Plan.findByIdAndDelete(planId);
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
