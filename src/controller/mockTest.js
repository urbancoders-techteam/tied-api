const MockTest = require("../model/mockTest");
const Plan = require("../model/plan");
const UserProductDetails = require("../model/userProductDetail");
const UserAssignTest = require("../model/userAssignTestDetails.js");

const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const { planByType } = require("./service");
const Batch = require("../model/batch.js");

//Section - create mockTest
exports.createMockTest = async (req, res) => {
  try {
    const { name, date, time, courseId } = req.body;
    const checkCourse = await Plan.findById(courseId);
    if (!checkCourse) {
      return sendResponse(res, 400, null, Messages.INVALID_COURSE);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(date);
    if (examDate < today) {
      return sendResponse(res, 400, "Exam date cannot be in the past");
    }
    const data = await MockTest.create({
      name,
      date: examDate,
      time,
      courseId,
      createdBy: req?.meta?._id,
    });
    sendResponse(res, 200, data, Messages.DATA_CREATED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - list mockTest
exports.listMockTest = async (req, res) => {
  try {
    const { page, limit, search, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);
    const plans = await planByType(type);

    const count = await MockTest.countDocuments({ courseId: { $in: plans } });
    const query = await MockTest.find({ courseId: { $in: plans } })
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
        { path: "courseId", select: "title" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean()
      .exec();

    const formattedData = query?.map((item) => ({
      _id: item?._id,
      name: item?.name ?? null,
      date: item?.date ?? null,
      time: item?.time ?? null,
      courseId: item?.courseId?.title ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
      createdAt: item?.createdAt ?? null,
    }));
    const completeData = {
      count,
      formattedData,
    };
    sendResponse(res, 200, completeData, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

// Section - Read all mock test names and IDs only
exports.getMockTestsForBatch = async (req, res) => {
  try {
    const { batchId, planId, type } = req.query;

    if (!batchId) return sendResponse(res, 400, null, "Batch ID is required");
    if (!planId) return sendResponse(res, 400, null, "Plan ID is required");

    if (!["assigned", "unassigned"].includes(type)) {
      return sendResponse(
        res,
        400,
        null,
        "Type must be 'assigned' or 'unassigned'"
      );
    }

    // 1. Get all mock tests for the given plan
    const planMockTests = await MockTest.find({ courseId: planId })
      .select("_id name courseId")
      .lean();

    // 2. Get the batch and its assigned mock tests
    const batch = await Batch.findById(batchId).select("mockTests").lean();

    if (!batch) return sendResponse(res, 404, null, "Batch not found");

    const assignedMockTestIds = batch.mockTests.map((id) => id.toString());

    // 3. Filter based on assignment type
    const result =
      type === "assigned"
        ? planMockTests.filter((mock) =>
            assignedMockTestIds.includes(mock._id.toString())
          )
        : planMockTests.filter(
            (mock) => !assignedMockTestIds.includes(mock._id.toString())
          );

    return sendResponse(res, 200, result, `${type} mock tests fetched`);
  } catch (error) {
    console.error("Error in getMockTestsForBatch:", error);
    return sendResponse(
      res,
      500,
      null,
      error.message || "Internal Server Error"
    );
  }
};

// Section- get mockTest by Id
exports.getMockTest = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await MockTest.findById(id).populate([
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
      { path: "courseId", select: "title" },
    ]);
    if (!data) {
      return sendResponse(res, 400, null, Messages.TEST_NOT_FOUND);
    }
    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

// Section- update mockTest
exports.updateMockTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, time, courseId } = req.body;
    const data = await MockTest.findById(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.TEST_NOT_FOUND);
    }

    const checkCourse = await Plan.findById(courseId);
    if (!checkCourse) {
      return sendResponse(res, 400, null, Messages.INVALID_COURSE);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(date);
    if (examDate < today) {
      return sendResponse(res, 400, "Exam date cannot be in the past");
    }

    await MockTest.findByIdAndUpdate(id, {
      $set: {
        name,
        // score,
        // feedBack,
        date: examDate,
        time,
        courseId,
        updatedBy: req?.meta?._id,
      },
    });
    sendResponse(res, 200, null, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - delete mockTest
exports.deleteMockTest = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await MockTest.findByIdAndDelete(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.TEST_NOT_FOUND);
    }
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - list
exports.list = async (req, res) => {
  try {
    const query = await MockTest.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
        { path: "courseId", select: "title" },
      ])
      .sort({ createdAt: -1 });

    const formattedData = query?.map((item) => ({
      _id: item?._id,
      name: item?.name ?? null,
      date: item?.date ?? null,
      time: item?.time ?? null,
      courseId: item?.courseId?.title ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
      createdAt: item?.createdAt ?? null,
    }));
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

//SECTION - Get mockTest based on user purchase
// old one
// exports.mockWeb = async (req, res) => {
//   try {
//     const { page, limit } = req.query;
//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const parsedLimit = parseInt(limit);
//     const userId = req?.meta?._id;
//     const filter = {
//       userId,
//       status: true,
//     };

//     const userAssignTest = await UserAssignTest.find(filter);

//     const mockTestIds = userAssignTest.map((test) => test.mockTest);

//     // Fetch the mock tests that match the purchased plans
//     const mockTests = await MockTest.find({ _id: { $in: mockTestIds } })
//       .populate([{ path: "courseId", select: "title" }])
//       .skip(skip)
//       .limit(parsedLimit)
//       .sort({ createdAt: -1 })
//       .lean()
//       .exec();

//     if (!mockTests.length) {
//       return sendResponse(
//         res,
//         200,
//         [],
//         "No mock test assign. Please contact to you consuler or admin"
//       );
//     }

//     // Format the data if necessary
//     const formattedData = mockTests.map((item) => ({
//       _id: item._id,
//       name: item.name ?? null,
//       date: item.date ?? null,
//       time: item.time ?? null,
//       courseId: item.courseId?._id ?? null,
//       courseName: item.courseId?.title ?? null,
//       // createdBy: item.createdBy ?? null,
//       // updatedBy: item.updatedBy ?? null,
//       // createdAt: item.createdAt ?? null
//     }));

//     sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
//   } catch (error) {
//     console.error(error);
//     sendResponse(res, 500, null, error.message);
//   }
// };

// new one
exports.mockWeb = async (req, res) => {
  try {
    const { page = 1, limit = 10, batchId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);
    const userId = req?.meta?._id;

    // ✅ If no batchId is provided, send the custom message
    if (!batchId) {
      return sendResponse(
        res,
        200,
        [],
        "You are not assigned to batch, Please contact your counselor or admin"
      );
    }

    // ✅ Step 1: Find the batch by ID, ensure the logged-in user is part of it
    const batch = await Batch.findOne({
      _id: batchId,
      students: userId,
    }).populate({
      path: "mockTests",
      populate: { path: "courseId", select: "title" },
    });

    // ❌ If batch not found or user not part of it
    if (!batch) {
      return sendResponse(
        res,
        200,
        [],
        "You are not assigned to batch, Please contact your counselor or admin"
      );
    }

    const mockTests = batch.mockTests || [];

    // ❌ No mock test assigned in the batch
    if (!mockTests.length) {
      return sendResponse(
        res,
        200,
        [],
        "No mock test found for this batch, Please contact your counselor or admin."
      );
    }

    // ✅ Step 2: Apply pagination manually
    const paginatedMockTests = mockTests
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + parsedLimit);

    // ✅ Step 3: Format the mock test data
    const formattedData = paginatedMockTests.map((item) => ({
      _id: item._id,
      name: item.name ?? null,
      date: item.date ?? null,
      time: item.time ?? null,
      courseId: item.courseId?._id ?? null,
      courseName: item.courseId?.title ?? null,
    }));

    return sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, null, error.message);
  }
};
