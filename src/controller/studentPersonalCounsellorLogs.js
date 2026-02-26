const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");

const StudentPersonalCounsellorLogs = require("../model/studentPersonalCounsellorLogs");
const Student = require("../model/studentModel");
const PersonalCounsellor = require("../model/personalCounsellor");
const Staff = require("../model/staffModel");
const { isValidObjectId } = require("mongoose");

//SECTION - create Student Personal Counsellor Logs
const createStudentPersonalCounsellorLogs = async (req, res) => {
  try {
    const studentId = req?.meta?._id;
    const { counsellorId, assignedDate, shouldCreateLog } = req.body;

    if (
      !studentId ||
      !counsellorId ||
      !assignedDate ||
      typeof shouldCreateLog !== "boolean"
    ) {
      const missingField = !studentId
        ? "Student ID"
        : !counsellorId
        ? "Counsellor ID"
        : !assignedDate
        ? "Assigned Date"
        : "Should Create Log";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (!isValidObjectId(studentId) || !isValidObjectId(counsellorId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const studentExists = await Student.findById(studentId);
    if (!studentExists) {
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Student"));
    }

    const staffExists = await Staff.findById(counsellorId);
    if (!staffExists) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Counsellor")
      );
    }

    if (!shouldCreateLog) {
      return sendResponse(res, 400, null, Messages.FAILED_TO_CREATE_LOG);
    }

    const meeting = await PersonalCounsellor.findOne({
      studentId,
      counsellorId,
      assignedDate: new Date(assignedDate),
    });

    if (!meeting) {
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Meeting"));
    }

    const cutoffTime = new Date(
      meeting.assignedDate.getTime() + meeting.duration * 60000
    );
    const now = new Date();

    const existingLog = await StudentPersonalCounsellorLogs.findOne({
      studentId,
      counsellorId,
      assignedDate: new Date(assignedDate),
    });

    if (existingLog && now < cutoffTime) {
      return sendResponse(
        res,
        400,
        null,
        Messages.LOG_ALREADY_CREATED(cutoffTime)
      );
    }

    // Create the log if allowed
    await StudentPersonalCounsellorLogs.create({
      studentId,
      counsellorId,
      assignedDate,
      createdBy: studentId,
    });

    return sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//SECTION -  get all Student Personal Counsellor Logs (Admin)
const getAllStudentPersonalCounsellorLogs = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    if (!isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const checkStaff = await Staff.findById(staffId);
    if (!checkStaff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }
    const count = await StudentPersonalCounsellorLogs.countDocuments();
    const studentPersonalCounsellorLogs =
      await StudentPersonalCounsellorLogs.find()
        .populate([
          { path: "studentId", select: "username" },
          { path: "counsellorId", select: "name" },
          { path: "createdBy", select: "username" },
        ])
        .skip(skip)
        .limit(parsedLimit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

    const data = await Promise.all(
      studentPersonalCounsellorLogs.map(async (item) => ({
        id: item?._id,
        studentId: item?.studentId?._id ?? null,
        studentName: item?.studentId?.username ?? null,
        counsellorId: item?.counsellorId?._id ?? null,
        counsellorName: item?.counsellorId?.name ?? null,
        assignedDate: item?.assignedDate ?? null,
        createdBy: item?.createdBy?.username ?? null,
      }))
    );

    sendResponse(res, 200, { count, data }, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - get all Student Personal Counsellor Logs (web)
const getAllStudentPersonalCounsellorLogsWeb = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { page, limit } = req.query;

    if (!isValidObjectId(userId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const checkStudent = await Student.findById(userId);
    if (!checkStudent) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const filter = { studentId: userId };

    const count = await StudentPersonalCounsellorLogs.countDocuments(filter);

    const studentPersonalCounsellorLogs =
      await StudentPersonalCounsellorLogs.find(filter)
        .populate([
          { path: "studentId", select: "username" },
          { path: "counsellorId", select: "name" },
          { path: "createdBy", select: "username" },
        ])
        .skip(skip)
        .limit(parsedLimit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

    const data = studentPersonalCounsellorLogs.map((item) => ({
      id: item?._id,
      studentId: item?.studentId?._id ?? null,
      studentName: item?.studentId?.username ?? null,
      counsellorId: item?.counsellorId?._id ?? null,
      counsellorName: item?.counsellorId?.name ?? null,
      assignedDate: item?.assignedDate ?? null,
      createdBy: item?.createdBy?.username ?? null,
    }));

    sendResponse(res, 200, { count, data }, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

module.exports = {
  getAllStudentPersonalCounsellorLogs,
  getAllStudentPersonalCounsellorLogsWeb,
  createStudentPersonalCounsellorLogs,
};
