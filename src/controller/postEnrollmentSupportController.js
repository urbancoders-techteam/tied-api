const Student = require("../model/studentModel");
const PostEnrollmentSupport = require("../model/postEnrollmentSupport");
const Staff = require("../model/staffModel");
const mongoose = require("mongoose");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const { getCurrentISTTime } = require("../helper/lib");
const PersonalCounsellor = require("../model/personalCounsellor");
const { isSuperAdmin } = require("./staffController");

const supportKeys = [
  "educationLoanSupport",
  "visaSupport",
  "travelAndForexSupport",
  "accommodationSupport",
];

exports.createOrUpdateEnrollmentSupport = async (req, res) => {
  try {
    const studentId = req.meta._id;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return sendResponse(res, 400, null, "Invalid student ID.");
    }

    const existing = await PostEnrollmentSupport.findOne({ studentId });

    const payload = {};
    const supportKeys = [
      "educationLoanSupport",
      "visaSupport",
      "travelAndForexSupport",
      "accommodationSupport",
    ];

    supportKeys.forEach((key) => {
      const bodyKey = req.body[key];

      if (existing) {
        // 🔁 On update: accept status as-is
        if (bodyKey) {
          payload[key] = {
            opted: bodyKey.opted ?? null,
            status: bodyKey.status ?? null,
          };
        } else {
          payload[key] = { opted: null, status: null };
        }
      } else {
        // 🆕 On create: set status = 'Yet to Begin' if opted is true and no status passed
        if (bodyKey) {
          payload[key] = {
            opted: bodyKey.opted ?? null,
            status:
              bodyKey.opted === true ? bodyKey.status || "Yet to Begin" : null,
          };
        } else {
          payload[key] = { opted: null, status: null };
        }
      }
    });

    if (existing) {
      const updated = await PostEnrollmentSupport.findOneAndUpdate(
        { studentId },
        {
          $set: {
            ...payload,
            updatedBy: studentId,
          },
        },
        { new: true }
      );
      return sendResponse(
        res,
        200,
        updated,
        "Enrollment support updated successfully."
      );
    } else {
      const newSupport = await PostEnrollmentSupport.create({
        studentId,
        createdBy: studentId,
        ...payload,
      });
      return sendResponse(
        res,
        201,
        newSupport,
        "Enrollment support created successfully."
      );
    }
  } catch (error) {
    console.error("Error in createOrUpdateEnrollmentSupport:", error);
    return sendResponse(res, 500, null, "Internal server error.");
  }
};

// SECTION: - Get PostEnrollmentSupport by Student ID (Student)
exports.getPostEnrollmentSupportByStudent = async (req, res) => {
  try {
    const studentId = req?.meta?._id;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const studentExist = await Student.findById(studentId);
    if (!studentExist) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    const latestCounsellor = await PersonalCounsellor.findOne({ studentId })
      .sort({ assignedDate: -1 })
      .populate({ path: "counsellorId", select: "name" })
      .lean();

    const supportData = await PostEnrollmentSupport.findOne({ studentId })
      .select("-__v -createdAt -updatedAt")
      .populate([{ path: "studentId", select: "username" }])
      .lean();

    if (!supportData) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    const data = {
      _id: supportData._id,
      studentId: supportData.studentId?._id ?? null,
      studentName: supportData.studentId?.username ?? null,
      educationLoanSupport: supportData.educationLoanSupport,
      visaSupport: supportData.visaSupport,
      travelAndForexSupport: supportData.travelAndForexSupport,
      accommodationSupport: supportData.accommodationSupport,
      counsellorId: latestCounsellor?.counsellorId?._id ?? null,
      counsellorName: latestCounsellor?.counsellorId?.name ?? null,
    };

    return sendResponse(res, 200, data, Messages.DATA_FETCHED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All PostEnrollmentSupport for Staff (WITH STUDENT NAME SEARCH)
exports.getAllPostEnrollmentSupportForStaff = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page = 1, limit = 10, studentId, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const checkStaff = await Staff.findById(staffId);
    if (!checkStaff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const isSuper = await isSuperAdmin(staffId);

    let filter = {};

    // 🔍 SEARCH BY STUDENT NAME → First find studentIds
    let searchedStudentIds = [];
    if (search) {
      const matchedStudents = await Student.find({
        username: { $regex: search, $options: "i" }
      }).select("_id");

      searchedStudentIds = matchedStudents.map((s) => s._id.toString());
    }

    if (isSuper) {
      // SUPER ADMIN
      if (studentId) {
        filter.studentId = studentId;
      }

      if (search && searchedStudentIds.length > 0) {
        filter.studentId = { $in: searchedStudentIds };
      }

    } else {

      // COUNSELLOR → Only assigned students
      const assignedRecords = await PersonalCounsellor.find({
        counsellorId: staffId
      }).select("studentId");

      const assignedIds = assignedRecords.map((r) => r.studentId.toString());

      filter.studentId = { $in: assignedIds };

      if (studentId) {
        filter.studentId = studentId;
      }

      if (search && searchedStudentIds.length > 0) {
        // Match only assigned + searched
        filter.studentId = {
          $in: assignedIds.filter((id) => searchedStudentIds.includes(id))
        };
      }
    }

    // Count
    const count = await PostEnrollmentSupport.countDocuments(filter);

    // Fetch Paginated Records
    const supports = await PostEnrollmentSupport.find(filter)
      .populate([
        { path: "studentId", select: "username" },
        { path: "createdBy", select: "username" },
        { path: "updatedBy", select: "username" },
      ])
      .skip(skip)
      .limit(parsedLimit)
      .sort({ createdAt: -1 })
      .lean();

    // Prepare Final Response
    const data = await Promise.all(
      supports.map(async (item) => {
        const counsellorData = await PersonalCounsellor.findOne({
          studentId: item.studentId?._id
        })
          .populate({ path: "counsellorId", select: "name" })
          .lean();

        return {
          id: item?._id,
          studentId: item?.studentId?._id ?? null,
          studentName: item?.studentId?.username ?? null,
          educationLoanSupport: item?.educationLoanSupport,
          visaSupport: item?.visaSupport,
          travelAndForexSupport: item?.travelAndForexSupport,
          accommodationSupport: item?.accommodationSupport,
          counsellorId: counsellorData?.counsellorId?._id ?? null,
          counsellorName: counsellorData?.counsellorId?.name ?? null,
          createdBy: item?.createdBy?.username ?? null,
          createdAt: item?.createdAt ?? null,
          updatedBy: item?.updatedBy?.username ?? null,
          updatedAt: item?.updatedAt ?? null,
        };
      })
    );

    return sendResponse(res, 200, { count, data }, Messages.DATA_FETCHED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Update Status for Post Enrollment Support Fields (Staff only)
exports.updatePostEnrollmentSupportStatus = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { studentId, type, status } = req.body;

    const allowedTypes = [
      "educationLoanSupport",
      "visaSupport",
      "travelAndForexSupport",
      "accommodationSupport",
    ];
    const allowedStatus = ["Yet to Begin", "Ongoing", "Completed"];

    if (!allowedTypes.includes(type)) {
      return sendResponse(
        res,
        400,
        null,
        `Invalid support type. Allowed: ${allowedTypes.join(", ")}`
      );
    }

    if (!allowedStatus.includes(status)) {
      return sendResponse(
        res,
        400,
        null,
        `Invalid status. Allowed: ${allowedStatus.join(", ")}`
      );
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return sendResponse(res, 404, null, Messages.STAFF_NOT_FOUND);
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return sendResponse(res, 404, null, Messages.STUDENT_NOT_FOUND);
    }

    const support = await PostEnrollmentSupport.findOne({ studentId });
    if (!support) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    // ✅ Check if opted === "Yes" from DB, not from payload
    const currentSupport = support[type];

    if (!currentSupport || currentSupport.opted !== true) {
      return sendResponse(
        res,
        400,
        null,
        `Cannot update status. '${type}' is not opted in.`
      );
    }

    // ✅ Proceed with status update
    support[type].status = status;
    support.updatedAt = getCurrentISTTime();
    support.updatedBy = staffId;

    await support.save();

    return sendResponse(
      res,
      200,
      null,
      `${type} status updated to '${status}' successfully.`
    );
  } catch (error) {
    console.error("Error in updatePostEnrollmentSupportStatus:", error);
    return sendResponse(res, 500, null, error.message);
  }
};

// SECTION: - Get specific Post Enrollment Support Field by studentId and type
exports.getPostEnrollmentSupportByType = async (req, res) => {
  try {
    const { studentId, type } = req.body;

    if (!studentId || !type) {
      return sendResponse(res, 400, null, "studentId and type are required");
    }

    if (!supportKeys.includes(type)) {
      return sendResponse(
        res,
        400,
        null,
        `Invalid type. Allowed: ${allowedTypes.join(", ")}`
      );
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return sendResponse(res, 404, null, Messages.STUDENT_NOT_FOUND);
    }

    const support = await PostEnrollmentSupport.findOne({ studentId });
    if (!support) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    const supportData = support[type];

    if (!supportData) {
      return sendResponse(
        res,
        404,
        null,
        `Support data not found for type '${type}'`
      );
    }

    return sendResponse(
      res,
      200,
      supportData,
      "Support data retrieved successfully."
    );
  } catch (error) {
    console.error("Error in getPostEnrollmentSupportByType:", error);
    return sendResponse(res, 500, null, error.message);
  }
};
