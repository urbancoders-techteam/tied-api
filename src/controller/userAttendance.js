const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const UserAttendance = require("../model/userAttendance");
const User = require("../model/studentModel");
const ClassModel = require("../model/class");
const UserProductDetail = require("../model/userProductDetail");
const StudentModel = require("../model/studentModel");
const UserClass = require("../model/userClass");
const { getSignedUrlImage } = require("../helper/uploadToS3");

exports.markAttendance = async (req, res) => {
  try {
    const { classId, data } = req.body;
    const { _id: staffId } = req.meta;

    // Check if class exists
    const classExist = await ClassModel.findById(classId);
    if (!classExist) {
      return sendResponse(res, 400, null, Messages.CLASS_NOT_FOUND);
    }

    // Validate that data is provided
    if (!data || data.length === 0) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_PROVIDED);
    }

    // Format the attendance data
    const formattedAttendance = data.map(({ userId, isAttend }) => {
      return {
        userId,
        classId,
        isAttend,
        markedBy: staffId,
        updatedBy: staffId,
      };
    });
    const markedDateAndTime = new Date();
    markedDateAndTime.setHours(markedDateAndTime.getHours() + 5);
    markedDateAndTime.setMinutes(markedDateAndTime.getMinutes() + 30);
    // Iterate over each attendance record to update or create it
    for (const attendance of formattedAttendance) {
      await UserAttendance.findOneAndUpdate(
        { userId: attendance.userId, classId: attendance.classId }, // Check for existing record
        {
          $set: {
            isAttend: attendance.isAttend,
            updatedBy: staffId, // The staff who updates the attendance
            markedDate: markedDateAndTime,
          },
          $setOnInsert: {
            markedBy: staffId, // The staff who marks the attendance, only set when the record is created
          },
        },
        { upsert: true, new: true } // upsert: create if not exists, new: return the updated document
      );
      await UserClass.findOneAndUpdate(
        { userId: attendance.userId, classId: attendance.classId },
        {
          $set: {
            isClassAttend: attendance.isAttend,
          },
        },
        { new: true }
      );
    }

    // Respond with success
    return sendResponse(
      res,
      200,
      null,
      Messages.ATTENDANCE_MARKED_SUCCESSFULLY
    );
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, null, "Server error");
  }
};

// Section - Student list for a particular class
exports.userList = async (req, res) => {
  try {
    const { classId } = req.body;

    const classExist = await ClassModel.findById(classId);
    if (!classExist) {
      return sendResponse(res, 400, null, Messages.CLASS_NOT_FOUND);
    }

    const numberOfUsers = await UserProductDetail.find({
      planId: classExist?.courseId,
    }).select("userId");

    if (numberOfUsers.length === 0) {
      return sendResponse(
        res,
        200,
        null,
        "This class doesn't have any student"
      );
    }

    const userIds = numberOfUsers.map((item) => item.userId);

    const students = await StudentModel.find({ _id: { $in: userIds } }).select(
      "_id username image"
    );

    const attendanceRecords = await UserAttendance.find({
      userId: { $in: userIds },
      classId: classId,
    }).select("userId isAttend");

    const response = await Promise.all(
      students.map(async (student) => {
        const attendance = attendanceRecords.find(
          (record) => record.userId.toString() === student._id.toString()
        );

        return {
          userId: student._id,
          username: student.username,
          image: student?.image ? await getSignedUrlImage(student.image) : null,
          isAttend: attendance ? attendance.isAttend : false,
        };
      })
    );

    return sendResponse(res, 200, response, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error("Error fetching student list:", error);
    return sendResponse(res, 500, null, "Internal server error");
  }
};
