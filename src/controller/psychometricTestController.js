const Student = require("../model/studentModel");
const Staff = require("../model/staffModel");
const PsychometricTest = require("../model/psychometricTest");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const { isValidObjectId } = require("mongoose");
const {
  s3Upload,
  getSignedUrlImage,
  getSignedUrl,
} = require("../helper/uploadToS3");
const PersonalCounsellor = require("../model/personalCounsellor");
const { getCurrentISTTime } = require("../helper/lib");
const { isSuperAdmin } = require("../controller/staffController");

//SECTION: Controller to get the status for Psychometric test  (web)
exports.getPsychometricTestStatus = async (req, res) => {
  try {
    const studentId = req?.meta?._id;

    if (!isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const student = await Student.findById(studentId).lean();

    if (!student) {
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Student"));
    }

    const psychometricTestStatus =
      student?.studyAbroadDetails?.personalizedMentoring?.psychometricTest ??
      false;

    sendResponse(res, 200, { psychometricTestStatus }, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// Allowed base64 prefixes
const allowedMimeTypes = [
  "data:application/pdf;base64,",
  "data:application/msword;base64,",
  "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,",
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/jpg;base64,",
];

//SECTION: Controller to upload test report for Psychometric test  (web)
exports.uploadPsychometricTest = async (req, res) => {
  try {
    const studentId = req?.meta?._id;
    const { testReport, reportStatus } = req.body;

    if (!testReport) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("Test Report")
      );
    }

    if (!isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const isAllowedType = allowedMimeTypes.some((type) =>
      testReport.startsWith(type)
    );
    if (!isAllowedType) {
      return sendResponse(
        res,
        400,
        null,
        "Only images (JPG, PNG), PDF, and Word documents are allowed."
      );
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Student"));
    }

    const personalCounsellor = await PersonalCounsellor.findOne({
      studentId,
    }).lean();
    if (
      !personalCounsellor ||
      !isValidObjectId(personalCounsellor.counsellorId)
    ) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Counsellor")
      );
    }

    const counsellorId = personalCounsellor.counsellorId;

    const uploadedtestReportUrl = await s3Upload(testReport, "pdf");

    // ✅ Check if psychometric test already exists
    const existingTest = await PsychometricTest.findOne({ studentId });

    if (existingTest) {
      // ✅ Update existing test
      await PsychometricTest.findByIdAndUpdate(existingTest._id, {
        counsellorId,
        testReport: uploadedtestReportUrl,
        reportStatus: reportStatus,
        updatedAt: getCurrentISTTime(),
      });

      return sendResponse(res, 200, null, "Test Report updated successfully.");
    } else {
      // ✅ Create new test
      await PsychometricTest.create({
        studentId,
        counsellorId,
        testReport: uploadedtestReportUrl,
        createdBy: studentId,
        createdAt: getCurrentISTTime(),
        updatedAt: getCurrentISTTime(),
      });

      return sendResponse(res, 200, null, Messages.DATA_CREATED);
    }
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Controller to get All test report for Psychometric test (admin)
exports.getAllPsychometricTests = async (req, res) => {
  try {
    const counsellorId = req?.meta?._id;
    const { page = 1, limit = 10, studentId, search = "" } = req.query;

    if (!isValidObjectId(counsellorId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(counsellorId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const isSuper = await isSuperAdmin(counsellorId);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let match = {};

    if (!isSuper) {
      match.counsellorId = new mongoose.Types.ObjectId(counsellorId);
    }

    if (studentId) {
      match.studentId = new mongoose.Types.ObjectId(studentId);
    }

    // SEARCH BY STUDENT NAME (username)
    let searchQuery = {};
    if (search.trim() !== "") {
      searchQuery = {
        "student.username": { $regex: search, $options: "i" },
      };
    }

    const pipeline = [
      { $match: match },

      // Populate student
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },

      // Populate counsellor
      {
        $lookup: {
          from: "staff",
          localField: "counsellorId",
          foreignField: "_id",
          as: "counsellor",
        },
      },
      { $unwind: "$counsellor" },

      // ⭐ Apply search here
      { $match: searchQuery },

      {
        $project: {
          _id: 1,
          studentId: "$student._id",
          studentName: "$student.username",
          counsellorName: "$counsellor.name",
          testReport: 1,
          status: 1,
          reportStatus: 1,
          createdAt: 1,
          updatedAt: 1,
          psychometricTestStatus:
            "$student.studyAbroadDetails.personalizedMentoring.psychometricTest",
        },
      },

      { $sort: { createdAt: -1 } },

      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const tests = await PsychometricTest.aggregate(pipeline);

    const countPipeline = [...pipeline];
    countPipeline.splice(
      countPipeline.length - 2,
      2
    ); // remove skip & limit
    const count = (await PsychometricTest.aggregate(countPipeline)).length;

    // Generate signed URLs
    for (let item of tests) {
      item.testReport = item.testReport
        ? await getSignedUrl(item.testReport)
        : null;
    }

    sendResponse(res, 200, { count, data: tests }, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION: Controller to get test report for student Psychometric test, (web)
exports.getPsychometricTestDocument = async (req, res) => {
  try {
    const studentId = req?.meta?._id;

    if (!isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const test = await PsychometricTest.findOne({ studentId }).lean();

    if (!test) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Test Report")
      );
    }

    const testReport = await getSignedUrlImage(test.testReport);

    const result = {
      testReport,
    };

    result.reportStatus = test.reportStatus;
    result.remark = test.remark;

    sendResponse(res, 200, result, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Controller to update status and remark for Psychometric Test (admin)
exports.updatePsychometricTestStatus = async (req, res) => {
  try {
    const counsellorId = String(req?.meta?._id);

    const { testId, reportStatus, remark } = req.body;

    const staff = await Staff.findById(counsellorId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const isSuper = await isSuperAdmin(counsellorId);

    const test = await PsychometricTest.findById(testId);
    if (!test) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("Test Report")
      );
    }

    // If not super admin, ensure this counsellor owns the test
    if (!isSuper && String(test.counsellorId) !== String(counsellorId)) {
      return sendResponse(
        res,
        403,
        null,
        "You are not authorized to update this test report."
      );
    }

    if (!["Approved", "Pending", "Not Approved"].includes(reportStatus)) {
      return sendResponse(
        res,
        400,
        null,
        "Report Status must be either 'Approved' or 'Not Approved'."
      );
    }

    test.reportStatus = reportStatus;
    test.remark = remark ?? "";
    test.updatedAt = getCurrentISTTime();

    await test.save();

    return sendResponse(res, 200, null, "Test status updated successfully.");
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Controller to get status and remark for Psychometric Test (admin)
exports.getPsychometricTestReportStatus = async (req, res) => {
  try {
    const { testId } = req.query;

    if (!testId) {
      return sendResponse(res, 400, null, "Test ID is required.");
    }

    const test = await PsychometricTest.findById(testId, "reportStatus remark");
    if (!test) {
      return sendResponse(res, 404, null, "Test not found.");
    }

    return sendResponse(
      res,
      200,
      test,
      "Test report status fetched successfully."
    );
  } catch (error) {
    return sendResponse(res, 500, null, error.message);
  }
};
