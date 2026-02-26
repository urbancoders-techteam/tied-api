const personalCounsellor = require("../model/personalCounsellor");
const student = require("../model/studentModel");
const staff = require("../model/staffModel");

const { sendResponse } = require("../helper/response");
const { isValidObjectId } = require("mongoose");
const { Messages } = require("../helper/message");
const PersonalCounsellor = require("../model/personalCounsellor");

const createPersonalCounsellor = async (req, res) => {
  try {
    const { studentId, counsellorId, assignedDate, meetingLink, duration } =
      req.body;

    // Validation
    if (
      !studentId ||
      !counsellorId ||
      !assignedDate ||
      !meetingLink ||
      !duration
    ) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(
          "Student ID, Counsellor ID, Assigned Date, Meeting Link, Duration"
        )
      );
    }

    if (!isValidObjectId(studentId) || !isValidObjectId(counsellorId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const studentExists = await student.findById(studentId);
    if (!studentExists) {
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Student"));
    }

    const counsellorExists = await staff.findById(counsellorId);
    if (!counsellorExists) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Counsellor")
      );
    }

    const newCounsellor = await personalCounsellor.create({
      studentId,
      counsellorId,
      assignedDate,
      meetingLink,
      duration,
      createdBy: req?.meta?._id,
    });

    sendResponse(res, 200, null, Messages.CREATED_DATA("Personal Counsellor"));
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
const getPersonalCounsellor = async (req, res) => {
  try {
    const { page, limit } = req.query; // Default pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const count = await PersonalCounsellor.countDocuments();
    const personalCounsellor = await PersonalCounsellor.find()
      .populate([
        { path: "studentId", select: "username" },
        { path: "counsellorId", select: "name" },
        { path: "createdBy", select: "name" },
      ])
      .skip(skip)
      .limit(parsedLimit)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Map and transform the data
    const data = await Promise.all(
      personalCounsellor.map(async (item) => ({
        id: item?._id,
        studentId: item?.studentId?._id ?? null,
        studentName: item?.studentId?.username ?? null,
        counsellorId: item?.counsellorId?._id ?? null,
        counsellorName: item?.counsellorId?.name ?? null,
        assignedDate: item?.assignedDate ?? null,
        meetingLink: item?.meetingLink ?? null,
        duration: item?.duration ?? null,
        isReschedule: item?.isReschedule ?? false,
        isMarkAsDone: item?.isMarkAsDone ?? false,
        createdBy: item?.createdBy?.name ?? null,
      }))
    );
    sendResponse(res, 200, { count, data }, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

const getPersonalCounsellorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("ID"));
    }

    if (!isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const personalCounsellor = await PersonalCounsellor.findById(id)
      .select("-createdBy -createdAt -updatedAt -updatedAt -__v ")
      .populate([
        { path: "studentId", select: "username" },
        { path: "counsellorId", select: "name" },
      ]);

    if (!personalCounsellor) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Personal Counsellor")
      );
    }

    sendResponse(res, 200, personalCounsellor, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

const updatePersonalCounsellor = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, counsellorId, assignedDate, meetingLink, duration } =
      req.body;

    if (!id) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("ID"));
    }

    if (!isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const personalCounsellor = await PersonalCounsellor.findById(id);

    if (!personalCounsellor) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Personal Counsellor")
      );
    }

    await PersonalCounsellor.findByIdAndUpdate(
      id,
      {
        $set: {
          studentId,
          counsellorId,
          assignedDate,
          meetingLink,
          duration,
        },
      },
      { new: true }
    );

    sendResponse(res, 200, null, Messages.UPDATED_DATA("Personal Counsellor"));
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

const deletePersonalCounsellor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("ID"));
    }

    if (!isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const personalCounsellor = await PersonalCounsellor.findByIdAndDelete(id);

    if (!personalCounsellor) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Personal Counsellor")
      );
    }

    sendResponse(res, 200, null, Messages.DELETED_DATA("Personal Counsellor"));
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

const getPersonalCounsellorByStudentId = async (req, res) => {
  try {
    const id = req?.meta?._id;

    if (!id) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("ID"));
    }

    if (!isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const personalCounsellor = await PersonalCounsellor.findOne({
      studentId: id,
    })
      .select("-createdBy -createdAt -updatedAt -updatedAt -__v ")
      .populate([{ path: "counsellorId", select: "name" }])
      .sort({ createdAt: -1 });

    if (!personalCounsellor) {
      return sendResponse(
        res,
        200,
        null,
        Messages.COUNSELLOR_NOT_FOUND
      );
    }

    sendResponse(res, 200, personalCounsellor, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

const updatePersonalCounsellorMeeting = async (req, res) => {
  try {
    const studentId = req?.meta?._id;
    const { assignedDate, isReschedule } = req.body;

    if (!assignedDate || typeof isReschedule !== "boolean") {
      const missingField = !assignedDate ? "Assigned Date" : "Is Reschedule";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (!isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const checkStudent = await student.findById(studentId);
    if (!checkStudent) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }
    const existingCounsellor = await PersonalCounsellor.findOne({
      studentId,
    }).sort({ createdAt: -1 });

    if (!existingCounsellor) {
      return sendResponse(
        res,
        200,
        null,
        Messages.COUNSELLOR_NOT_FOUND
      );
    }

    await PersonalCounsellor.findByIdAndUpdate(
      existingCounsellor._id,
      {
        $set: {
          assignedDate,
          isReschedule,
          duration: existingCounsellor.duration,
          counsellorId: existingCounsellor.counsellorId,
          meetingLink: existingCounsellor.meetingLink,
        },
      },
      { new: true }
    );

    sendResponse(
      res,
      200,
      null,
      Messages.UPDATED_DATA("Personal Counsellor Meeting")
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

const updatePersonalCounsellorMarkAsDone = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMarkAsDone } = req.body;

    if (!id) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("ID"));
    }

    if (!isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    if (typeof isMarkAsDone !== "boolean") {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("Is Mark As Done")
      );
    }

    const personalCounsellorData = await PersonalCounsellor.findById(id);

    if (!personalCounsellorData) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Personal Counsellor")
      );
    }

    await PersonalCounsellor.findByIdAndUpdate(
      id,
      {
        $set: {
          isMarkAsDone,
        },
      },
      { new: true }
    );

    sendResponse(
      res,
      200,
      null,
      Messages.UPDATED_DATA("Personal Counsellor Mark As Done")
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

module.exports = {
  createPersonalCounsellor,
  getPersonalCounsellor,
  getPersonalCounsellorById,
  updatePersonalCounsellor,
  deletePersonalCounsellor,
  getPersonalCounsellorByStudentId,
  updatePersonalCounsellorMeeting,
  updatePersonalCounsellorMarkAsDone,
};
