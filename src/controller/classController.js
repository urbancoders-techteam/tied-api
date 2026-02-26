const Plan = require("../model/plan");
const Class = require("../model/class");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const LearningResource = require("../model/learningResources");
const { planByType } = require("./service");
const Banner = require("../model/Banner");
const Batch = require("../model/batch");

//Section-  Create a new class
exports.createClass = async (req, res) => {
  try {
    const {
      name,
      courseId,
      learningId,
      practiceId,
      duration,
      date,
      meetingLink,
    } = req.body;
    const checkCourse = await Plan.findById(courseId);
    if (!checkCourse) {
      return sendResponse(res, 400, null, Messages.INVALID_COURSE);
    }

    const checkBannerCourse = await Banner.findOne({ courseId: courseId });
    const noOfClasses = checkBannerCourse?.numberOfClass;
    const classes = await Class.find({ courseId: courseId });
    const totalClasses = classes.length;

    if (totalClasses >= noOfClasses) {
      return sendResponse(res, 200, null, Messages.MAX_CLASS_REACHED);
    }

    const learningCheck = await LearningResource.findById(learningId);
    if (!learningCheck) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    const today = new Date();
    const classDate = new Date(date);
    if (classDate < today) {
      return sendResponse(res, 400, "class date cannot be in the past");
    }

    const newClass = await Class.create({
      name,
      courseId,
      learningId,
      practiceId,
      duration,
      date: classDate,
      // time,
      meetingLink,
      createdBy: req?.meta?._id,
    });
    sendResponse(res, 200, newClass, Messages.DATA_CREATED);
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

//Section- Read all classes
exports.getAllClasses = async (req, res) => {
  try {
    const { page, limit, search, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const plans = await planByType(type);
    const count = await Class.countDocuments({ courseId: { $in: plans } });
    const classes = await Class.find({ courseId: { $in: plans } })
      .populate([
        { path: "courseId", select: "title" },
        { path: "learningId", select: "name" },
        { path: "practiceId", select: "name" },
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean()
      .exec();
    const formattedData = classes?.map((item) => ({
      _id: item?._id,
      courseId: item?.courseId?._id ?? null,
      courseName: item?.courseId?.title ?? null,
      learningId: item?.learningId?._id ?? null,
      learningName: item?.learningId?.name ?? null,
      practiceId: item?.practiceId?._id ?? null,
      practiceName: item?.practiceId?.name ?? null,
      name: item?.name ?? null,
      date: item?.date ?? null,
      // time: item?.time ?? null,
      duration: item?.duration ?? null,
      meetingLink: item?.meetingLink ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
      createdAt: item?.createdAt ?? null,
    }));
    sendResponse(
      res,
      200,
      { count, formattedData },
      "Classes retrieved successfully"
    );
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

// Read a specific class by ID
exports.getClassById = async (req, res) => {
  try {
    const classId = req.params.id;
    const classData = await Class.findById(classId).populate([
      { path: "courseId", select: "title" },
      { path: "learningId", select: "name" },
      { path: "practiceId", select: "name" },
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
    ]);
    if (!classData) {
      sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, classData, Messages.DATA_RETRIVED);
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

// Update a specific class by ID
exports.updateClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const {
      name,
      courseId,
      learningId,
      practiceId,
      duration,
      date,
      time,
      meetingLink,
    } = req.body;

    const classData = await Class.findById(classId);
    if (!classData) {
      sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    const checkCourse = await Plan.findById(courseId);
    if (!checkCourse) {
      return sendResponse(res, 400, null, Messages.INVALID_COURSE);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const classDate = new Date(date);
    if (classDate < today) {
      return sendResponse(res, 400, "class date cannot be in the past");
    }

    await Class.findByIdAndUpdate(classId, {
      $set: {
        name,
        courseId,
        learningId,
        practiceId,
        duration,
        date: classDate,
        time,
        meetingLink,
        updatedBy: req?.meta?._id,
      },
    });
    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

// Delete a specific class by ID
exports.deleteClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const deletedClass = await Class.findByIdAndDelete(classId);
    if (!deletedClass) {
      sendResponse(res, 404, null, "Class not found");
    }
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (err) {
    sendResponse(res, 500, null, "Error deleting class: " + err.message);
  }
};

// Section - Read all class names and IDs only
exports.getClassesForBatch = async (req, res) => {
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

    // 1. Get all classes of the given plan
    const planClasses = await Class.find({ courseId: planId })
      .select("_id name courseId")
      .lean();

    // 2. Get the batch and its assigned classes
    const batch = await Batch.findById(batchId).select("classes").lean();

    if (!batch) return sendResponse(res, 404, null, "Batch not found");

    const assignedClassIds = batch.classes.map((id) => id.toString());

    // 3. Filter based on assignment
    const result =
      type === "assigned"
        ? planClasses.filter((cls) =>
            assignedClassIds.includes(cls._id.toString())
          )
        : planClasses.filter(
            (cls) => !assignedClassIds.includes(cls._id.toString())
          );

    return sendResponse(res, 200, result, `${type} classes fetched`);
  } catch (error) {
    console.error("Error in getClassesForBatch:", error);
    return sendResponse(
      res,
      500,
      null,
      error.message || "Internal Server Error"
    );
  }
};
