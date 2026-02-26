const UniversitySortListing = require("../model/UniversitySortListing");
const Student = require("../model/studentModel");
const Country = require("../model/country");
const Staff = require("../model/staffModel");
const { Messages } = require("../helper/message");
const mongoose = require("mongoose");
const { getCurrentISTTime } = require("../helper/lib");
const { sendResponse } = require("../helper/response");

const FieldOfInterest = require("../model/fieldOfInterest");
const PersonalCounsellor = require("../model/personalCounsellor");
const StudentUniversitySortListing = require("../model/StudentUniversitySortListing");
const { isSuperAdmin } = require("../controller/staffController");

// SECTION: - Create UniversitySortListing (Admin)
exports.createUniversitySortListingForStaff = async (req, res) => {
  try {
    const staffId = req?.meta?._id;

    const {
      universityIds,
      countryId,
      courseId,
      studentId,
      // Optional fields
      programWebsiteLink,
      duration,
      marksCriteria,
      testRequirement,
      workExpRequirement,
      location,
      intake,
      applicationDeadline,
      feesStructure,
      scholarshipDetails,
      remarks,
    } = req.body;

    // Required fields check
    if (!universityIds || !countryId || !courseId) {
      const missingField = !universityIds
        ? "University IDs"
        : !countryId
        ? "Country ID"
        : "Course ID";

      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (!Array.isArray(universityIds) || universityIds.length === 0) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("University IDs (non-empty array)")
      );
    }

    const idsToValidate = {
      studentId,
      countryId,
      courseId,
      staffId,
    };

    universityIds.forEach((id, index) => {
      idsToValidate[`universityIds[${index}]`] = id;
    });

    for (const [key, value] of Object.entries(idsToValidate)) {
      if (!mongoose.isValidObjectId(value)) {
        return sendResponse(
          res,
          400,
          null,
          `${key.toUpperCase()} ${Messages.INVALID_ID}`
        );
      }
    }

    // Check if related documents exist
    const [studentExist, countryExist, courseExist, staffExist] =
      await Promise.all([
        Student.findById(studentId),
        Country.findById(countryId),
        FieldOfInterest.findById(courseId),
        Staff.findById(staffId),
      ]);

    if (!studentExist)
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    if (!countryExist)
      return sendResponse(res, 400, null, Messages.COUNTRY_NOT_FOUND);
    if (!courseExist)
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Course"));
    if (!staffExist)
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);

    if (
      !studentExist.counsellorId ||
      !mongoose.isValidObjectId(studentExist.counsellorId)
    ) {
      return sendResponse(res, 400, null, Messages.COUNSELLOR_NOT_FOUND);
    }

    const existingListing = await UniversitySortListing.findOne({
      studentId,
      courseId,
    });

    if (existingListing) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA_US);
    }

    // Construct payload and remove empty optional fields
    const payload = {
      studentId,
      courseId,
      universityIds,
      countryId,
      counsellorId: studentExist.counsellorId,
      createdBy: staffId,
      createdByModel: "Staff",
      createdAt: getCurrentISTTime(),
      updatedAt: getCurrentISTTime(),
      programWebsiteLink,
      duration,
      marksCriteria,
      testRequirement,
      workExpRequirement,
      location,
      intake,
      applicationDeadline,
      feesStructure,
      scholarshipDetails,
      remarks,
    };

    // Remove undefined, null, or "" values
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([_, value]) => value !== "" && value !== null && value !== undefined
      )
    );

    await UniversitySortListing.create(cleanPayload);

    return sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All UniversitySortListing Created By Students (Admin)
exports.getAllUniversitySortListingsStudents = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit } = req.query;

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const isSuper = await isSuperAdmin(staffId);

    let filter = {};

    if (!isSuper) {
      const assignedRecords = await PersonalCounsellor.find({
        counsellorId: staffId,
      }).select("studentId");
      const studentIds = [
        ...new Set(assignedRecords.map((r) => r.studentId.toString())),
      ];

      if (studentIds.length === 0) {
        return sendResponse(
          res,
          200,
          { count: 0, data: [] },
          Messages.DATA_RETRIVED
        );
      }

      filter.studentId = { $in: studentIds };
      filter.counsellorId = staffId;
    }

    const count = await StudentUniversitySortListing.countDocuments(filter);

    let query = StudentUniversitySortListing.find(filter)
      .populate([
        { path: "studentId", select: "username email" },
        { path: "counsellorId", select: "name" },
        { path: "createdBy", select: "username" },
      ])
      .sort({ createdAt: -1 });

    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      query = query.skip(skip).limit(parseInt(limit));
    }

    const listings = await query.lean();

    const formattedData = listings.map((item) => ({
      _id: item._id,
      studentName: item?.studentId?.username ?? null,
      studentEmail: item?.studentId?.email ?? null,
      university: item?.university ?? null,
      country: item?.country ?? null,
      course: item?.course ?? null,
      counsellorName: item?.counsellorId?.name ?? null,
      createdBy: item?.createdBy?.username ?? null,
      createdAt: item?.createdAt ?? null,
      updatedAt: item?.updatedAt ?? null,
    }));

    return sendResponse(
      res,
      200,
      {
        count,
        data: formattedData,
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get UniversitySortListing For Councelor  (Student)
exports.getUniversitySortListingForCouncellor = async (req, res) => {
  try {
    const { studentId } = req.body;

    // Validate student ID
    if (!studentId || !mongoose.isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    // Confirm student exists
    const studentExist = await Student.findById(studentId);
    if (!studentExist) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    // Fetch all listings with full detail
    const existingListing = await UniversitySortListing.find({
      studentId,
      createdByModel: "Staff",
    })
      .populate([
        { path: "universityIds", select: "name" },
        { path: "countryId", select: "name" },
        { path: "courseId", select: "name" },
        { path: "counsellorId", select: "name email" },
      ])
      .lean(); // Convert to plain JS object (faster for read operations)

    // If no records found
    if (!existingListing || existingListing.length === 0) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    // Return full data
    return sendResponse(res, 200, existingListing, Messages.DATA_FOUND);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Get all student selected universities (studentId from token, no pagination)
exports.getUniversitySortListingForStudent = async (req, res) => {
  try {
    const { studentId } = req.body;

    const studentUniversities = await StudentUniversitySortListing.find({
      studentId,
    }).sort({ createdAt: -1 });

    const result = studentUniversities.map((item) => ({
      id: item?.id,
      university: item?.university,
      country: item?.country,
      course: item?.course,
    }));

    // Directly pass result as response data
    sendResponse(res, 200, result, Messages.DATA_RETRIVED);
  } catch (error) {
    console.log(error);
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Method to delete student selected universities.
exports.deleteUniversitySortlistedByStudent = async (req, res) => {
  try {
    const { id } = req.body;

    const deleted = await StudentUniversitySortListing.findByIdAndDelete(id);

    if (!deleted) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    return sendResponse(res, 200, deleted, Messages.DELETED_DATA);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All UniversitySortListing Created By Counsellor (Admin)
exports.getUniversitySortListingsCreatedByCounsellor = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit, studentId, universityId, countryId, courseId } =
      req.query;

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const isSuper = await isSuperAdmin(staffId);

    let filter = {
      createdByModel: "Staff",
      ...(universityId && { universityIds: universityId }),
      ...(countryId && { countryId }),
      ...(courseId && { courseId }),
    };

    if (isSuper) {
      if (studentId) {
        filter.studentId = studentId;
      }
    } else {
      const assignedRecords = await PersonalCounsellor.find({
        counsellorId: staffId,
      }).select("studentId");

      const studentIds = [
        ...new Set(
          assignedRecords.map((record) => record.studentId.toString())
        ),
      ];

      if (studentId) {
        filter.studentId = studentId;
      } else {
        filter.studentId = { $in: studentIds };
      }

      filter.createdBy = staffId;
    }

    const count = await UniversitySortListing.countDocuments(filter);

    let query = UniversitySortListing.find(filter)
      .populate([
        { path: "createdBy", select: "name" },
        { path: "studentId", select: "username email" },
        { path: "universityIds", select: "name" },
        { path: "countryId", select: "name" },
        { path: "courseId", select: "name" },
        { path: "counsellorId", select: "name" },
      ])
      .sort({ createdAt: -1 });

    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const parsedLimit = parseInt(limit);
      query = query.skip(skip).limit(parsedLimit);
    }

    const listings = await query.lean();

    const formattedData = listings.map((item) => ({
      _id: item._id,
      studentName: item?.studentId?.username ?? null,
      studentEmail: item?.studentId?.email ?? null,
      universityNames: Array.isArray(item.universityIds)
        ? item.universityIds.map((u) => u?.name).filter(Boolean)
        : [],
      countryName: item?.countryId?.name ?? null,
      courseName: item?.courseId?.name ?? null,
      counsellorName: item?.counsellorId?.name ?? null,
      createdBy: item?.createdBy?.name ?? null,
      createdAt: item?.createdAt ?? null,
      updatedAt: item?.updatedAt ?? null,
    }));

    return sendResponse(
      res,
      200,
      { count, data: formattedData },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All UniversitySortListing  By Id  Created Student (Admin)
exports.getUniversitySortListingById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const listing = await StudentUniversitySortListing.findById(id)
      .populate([
        { path: "studentId", select: "username email" },
        { path: "counsellorId", select: "name" },
        { path: "createdBy", select: "username" },
      ])
      .lean();

    if (!listing) {
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA);
    }

    // Format the single listing
    const formattedData = {
      _id: listing._id,
      studentName: listing?.studentId?.username ?? null,
      studentEmail: listing?.studentId?.email ?? null,
      university: listing?.university ?? null,
      country: listing?.country ?? null,
      course: listing?.course ?? null,
      counsellorName: listing?.counsellorId?.name ?? null,
      createdBy: listing?.createdBy?.username ?? null,
      createdAt: listing?.createdAt ?? null,
      updatedAt: listing?.updatedAt ?? null,
    };

    return sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
// SECTION: - Delete  UniversitySortListing  By Id  Created Student(Admin)
exports.deleteStudentUniversitySortListingById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const listing = await StudentUniversitySortListing.findById(id);

    if (!listing) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    await StudentUniversitySortListing.findByIdAndDelete(id);

    return sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.getStudentWithCounsellor = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.body;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const pipeline = [
      {
        $match: {
          counsellorId: { $ne: null }, // Only students with assigned counsellors
        },
      },
      {
        $lookup: {
          from: "staffs", // ✅ correct collection for counsellors
          localField: "counsellorId",
          foreignField: "_id",
          as: "counsellor",
        },
      },
      { $unwind: "$counsellor" },
      {
        $project: {
          studentId: "$_id",
          studentName: "$username",
          studentEmail: "$email", // optional
          counsellorId: "$counsellor._id",
          counsellorName: "$counsellor.name",
        },
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const result = await Student.aggregate(pipeline);

    const count = await Student.countDocuments({
      counsellorId: { $ne: null },
    });

    sendResponse(res, 200, { result, count }, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Get student selected universities.
exports.getStudentSelectedUniversity = async (req, res) => {
  try {
    const { page, limit, studentId } = req.body;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    // Get first record for reference (to fetch student and counsellor)
    const oneRecord = await StudentUniversitySortListing.findOne({ studentId });

    const studentUniversities = await StudentUniversitySortListing.find({
      studentId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("createdBy", "username");
    const count = await StudentUniversitySortListing.countDocuments({
      studentId,
    });

    //NOTE: Fetch single user and counsellor data.
    const [student] = await Promise.all([
      Student.findById(studentId).select("username counsellorId").populate({
        path: "counsellorId",
        select: "name",
      }),
      Staff.findById(oneRecord?.counsellorId).select("name"),
    ]);

    const studentName = student?.username || "";
    const counsellorName = student?.counsellorId?.name || "";

    const result = studentUniversities.map((item) => ({
      id: item?._id,
      university: item?.university,
      country: item?.country,
      course: item?.course,
      createdAt: item?.createdAt,
      createdBy: item?.createdBy,
    }));

    sendResponse(
      res,
      200,
      { studentName, counsellorName, result, count },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    console.log(error);
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Delete student selected university by ID
exports.deleteStudentSelectedUniversity = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the record exists
    const record = await StudentUniversitySortListing.findById(id);
    if (!record) {
      return sendResponse(res, 404, null, "Data university not found");
    }

    // Delete the record
    await StudentUniversitySortListing.findByIdAndDelete(id);

    sendResponse(res, 200, null, "Data deleted successfully");
  } catch (error) {
    console.log(error);
    sendResponse(res, 400, null, error.message);
  }
};

// start

//SECTION - Get selected universities by counsellor which selected for student.
exports.getUniversityByCounseller = async (req, res) => {
  try {
    const { page, limit, studentId, counsellerId } = req.body;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matchStage = {};
    if (studentId)
      matchStage.studentId = new mongoose.Types.ObjectId(studentId);
    if (counsellerId)
      matchStage.counsellerId = new mongoose.Types.ObjectId(counsellerId);

    // Aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },
      {
        $lookup: {
          from: "universities",
          localField: "universityIds",
          foreignField: "_id",
          as: "university",
        },
      },
      { $unwind: "$university" },
      {
        $lookup: {
          from: "countries",
          localField: "countryId",
          foreignField: "_id",
          as: "country",
        },
      },
      { $unwind: "$country" },
      {
        $lookup: {
          from: "fieldofinterests",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $lookup: {
          from: "staffs",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByStaff",
        },
      },

      {
        $addFields: {
          createdBy: {
            $let: {
              vars: {
                staff: { $arrayElemAt: ["$createdByStaff", 0] },
              },
              in: {
                _id: "$$staff._id",
                name: "$$staff.name",
              },
            },
          },
        },
      },

      {
        $project: {
          universitySortListingId: "$_id",
          university: "$university.name",
          country: "$country.name",
          course: "$course.name",
          createdAt: 1,
          updatedAt: 1,
          studentId: 1,
          counsellorId: 1,
          countryId: 1,
          courseId: 1,
          universityId: "$university._id",
          programWebsiteLink: 1,
          duration: 1,
          marksCriteria: 1,
          testRequirement: 1,
          workExpRequirement: 1,
          location: 1,
          intake: 1,
          applicationDeadline: 1,
          feesStructure: 1,
          scholarshipDetails: 1,
          remarks: 1,
          status: 1,

          // New requested fields
          sopLorEssayStatus: 1,
          applicationOpeningDate: 1,
          applicationDeadlines: 1,
          applicationEntryDate: 1,
          greGmatSatRequirement: 1,
          greGmatSatMinScore: 1,
          englishProficiencyTest: 1,
          workExperienceRequirement: 1,
          minWorkExperience: 1,
          internshipsConsidered: 1,
          internshipInPreferredFields: 1,
          tuitionFee: 1,
          lorsRequired: 1,
          noOfLOR: 1,
          lorType: 1,
          sopRequired: 1,
          sopWordLimit: 1,
          additionalEssaysRequired: 1,
          additionalEssaysTopic: 1,
          resumeRequired: 1,
          portfolioRequired: 1,
          apsRequired: 1,
          interviewRequired: 1,
          interviewMode: 1,
          applicationFee: 1,
          onlineApplicationLink: 1,
          livingExpenses: 1,
          offerLetterStatus: 1,
          typeOfOfferLetter: 1,
          conditionalOfferLetter: 1,
          conditionalOfferLetterAcceptanceDt: 1,
          unconditionalOfferLetter: 1,
          unconditionalOfferLetterAcceptanceDt: 1,
          scholarshipsDetails: 1,
          scholarshipAmount: 1,
          universityContactEmail: 1,
          admissionServiceRemark: 1,

          shortlist: 1,

          createdBy: 1,
          createdByModel: 1,
          updatedBy: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const result = await UniversitySortListing.aggregate(pipeline);

    // Total count
    const totalDocsPipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },
      { $count: "total" },
    ];
    const totalDocsResult = await UniversitySortListing.aggregate(
      totalDocsPipeline
    );
    const count = totalDocsResult.length > 0 ? totalDocsResult[0].total : 0;

    // Get student (with counsellor info)
    const student = await Student.findById(studentId).select(
      "username personalCounsellor counsellorId"
    );

    if (!student) {
      return sendResponse(res, 404, null, Messages.STUDENT_NOT_FOUND);
    }

    // Get counsellor name from student's assigned counsellor
    const counsellor = student.counsellorId
      ? await Staff.findById(student.counsellorId).select("name")
      : null;

    const studentName = student?.username || "";
    const counsellorName = counsellor?.name || "";

    const responseData = {
      studentName: studentName,
      counsellorName: counsellorName,
      result,
      count,
    };

    sendResponse(res, 200, responseData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Get Scholarships by Counsellor for a Student
exports.getScholarshipsByCounsellor = async (req, res) => {
  try {
    const { page, limit, studentId, counsellorId } = req.body;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matchStage = {};
    if (studentId)
      matchStage.studentId = new mongoose.Types.ObjectId(studentId);
    if (counsellorId)
      matchStage.counsellorId = new mongoose.Types.ObjectId(counsellorId);

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },
      {
        $lookup: {
          from: "universities",
          localField: "universityIds",
          foreignField: "_id",
          as: "university",
        },
      },
      { $unwind: "$university" },

      {
        $lookup: {
          from: "staffs",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByStaff",
        },
      },
      {
        $addFields: {
          createdBy: {
            $let: {
              vars: {
                staff: { $arrayElemAt: ["$createdByStaff", 0] },
              },
              in: {
                _id: "$$staff._id",
                name: "$$staff.name",
              },
            },
          },
        },
      },

      {
        $project: {
          university: "$university.name",
          universityId: 1,
          studentId: 1,
          counsellorId: 1,
          countryId: 1,
          country: 1,
          courseId: 1,
          course: 1,
          createdBy: 1,
          updatedBy: 1,
          createdAt: 1,
          updatedAt: 1,
          countryScholarship: 1,
          universityScholarship: 1,
          otherScholarship: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const result = await UniversitySortListing.aggregate(pipeline);

    // Count
    const totalDocsPipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },
      { $count: "total" },
    ];
    const totalDocsResult = await UniversitySortListing.aggregate(
      totalDocsPipeline
    );
    const count = totalDocsResult.length > 0 ? totalDocsResult[0].total : 0;

    // Get student (with counsellor info)
    const student = await Student.findById(studentId).select(
      "username counsellorId"
    );

    if (!student) {
      return sendResponse(res, 404, null, Messages.STUDENT_NOT_FOUND);
    }

    // Get counsellor name from student's assigned counsellor
    const counsellor = student.counsellorId
      ? await Staff.findById(student.counsellorId).select("name")
      : null;

    const studentName = student?.username || "";
    const counsellorName = counsellor?.name || "";

    const responseData = {
      studentName,
      counsellorName,
      result,
      count,
    };

    return sendResponse(res, 200, responseData, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Get Scholarship list for web
exports.getScholarshipsForWeb = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.body;

    const studentId = req.meta._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ✅ shortlisted universities ka check add kiya
    const matchStage = {
      studentId: new mongoose.Types.ObjectId(studentId),
      shortlist: true,
    };

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },

      // University details
      {
        $lookup: {
          from: "universities",
          localField: "universityIds",
          foreignField: "_id",
          as: "university",
        },
      },
      { $unwind: "$university" },

      {
        $project: {
          university: "$university.name",
          countryScholarship: 1,
          universityScholarship: 1,
          otherScholarship: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const result = await UniversitySortListing.aggregate(pipeline);

    // Count
    const totalDocsPipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },
      { $count: "total" },
    ];
    const totalDocsResult = await UniversitySortListing.aggregate(
      totalDocsPipeline
    );
    const count = totalDocsResult.length > 0 ? totalDocsResult[0].total : 0;

    const responseData = { result, count };

    return sendResponse(res, 200, responseData, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Get shortlisted universities for a student by counsellor
exports.getShortlistedUniversitiesByCounsellor = async (req, res) => {
  try {
    const { page, limit, studentId, counsellerId } = req.body;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matchStage = { shortlist: true };
    if (studentId)
      matchStage.studentId = new mongoose.Types.ObjectId(studentId);
    if (counsellerId)
      matchStage.counsellerId = new mongoose.Types.ObjectId(counsellerId);

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },
      // University
      {
        $lookup: {
          from: "universities",
          localField: "universityIds",
          foreignField: "_id",
          as: "university",
        },
      },
      { $unwind: "$university" },

      // Country
      {
        $lookup: {
          from: "countries",
          localField: "countryId",
          foreignField: "_id",
          as: "country",
        },
      },
      { $unwind: "$country" },

      // Course
      {
        $lookup: {
          from: "fieldofinterests",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      // Created By (Staff)
      {
        $lookup: {
          from: "staffs",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByStaff",
        },
      },
      {
        $addFields: {
          createdBy: {
            $let: {
              vars: { staff: { $arrayElemAt: ["$createdByStaff", 0] } },
              in: {
                _id: "$$staff._id",
                name: "$$staff.name",
              },
            },
          },
        },
      },

      // Project fields
      {
        $project: {
          universitySortListingId: "$_id",
          university: "$university.name",
          country: "$country.name",
          course: "$course.name",
          createdAt: 1,
          updatedAt: 1,
          studentId: 1,
          counsellorId: 1,
          countryId: 1,
          courseId: 1,
          universityId: "$university._id",
          programWebsiteLink: 1,
          duration: 1,
          status: 1,
          shortlist: 1,

          // New requested fields
          sopLorEssayStatus: 1,
          applicationOpeningDate: 1,
          applicationDeadlines: 1,
          applicationEntryDate: 1,
          greGmatSatRequirement: 1,
          greGmatSatMinScore: 1,
          englishProficiencyTest: 1,
          workExperienceRequirement: 1,
          minWorkExperience: 1,
          internshipsConsidered: 1,
          internshipInPreferredFields: 1,
          tuitionFee: 1,
          lorsRequired: 1,
          noOfLOR: 1,
          lorType: 1,
          sopRequired: 1,
          sopWordLimit: 1,
          additionalEssaysRequired: 1,
          additionalEssaysTopic: 1,
          resumeRequired: 1,
          portfolioRequired: 1,
          apsRequired: 1,
          interviewRequired: 1,
          interviewMode: 1,
          applicationFee: 1,
          onlineApplicationLink: 1,
          livingExpenses: 1,
          offerLetterStatus: 1,
          typeOfOfferLetter: 1,
          conditionalOfferLetter: 1,
          conditionalOfferLetterAcceptanceDt: 1,
          unconditionalOfferLetter: 1,
          unconditionalOfferLetterAcceptanceDt: 1,
          scholarshipsDetails: 1,
          scholarshipAmount: 1,
          universityContactEmail: 1,
          admissionServiceRemark: 1,

          shortlist: 1,

          createdBy: 1,
          createdByModel: 1,
          updatedBy: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const result = await UniversitySortListing.aggregate(pipeline);

    // Total count
    const totalDocsPipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },
      { $count: "total" },
    ];
    const totalDocsResult = await UniversitySortListing.aggregate(
      totalDocsPipeline
    );
    const count = totalDocsResult.length > 0 ? totalDocsResult[0].total : 0;

    // Student info
    const student = await Student.findById(studentId).select(
      "username personalCounsellor counsellorId"
    );
    if (!student) {
      return sendResponse(res, 404, null, Messages.STUDENT_NOT_FOUND);
    }

    // Counsellor info
    const counsellor = student.counsellorId
      ? await Staff.findById(student.counsellorId).select("name")
      : null;

    const responseData = {
      studentName: student?.username || "",
      counsellorName: counsellor?.name || "",
      result,
      count,
    };

    sendResponse(res, 200, responseData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get by id UniversitySortListing (Admin)
exports.getUniversitySortListingByIdForCounsellor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const data = await UniversitySortListing.findById(id)
      .populate("studentId", "username email")
      .populate("countryId", "name")
      .populate("courseId", "name")
      .populate("universityIds", "name image location")
      .populate("counsellorId", "name");

    if (!data) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    return sendResponse(res, 200, data, Messages.DATA_FETCHED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Create UniversitySortListing (Student)
exports.createStudentUniversityListing = async (req, res) => {
  try {
    const studentId = req?.meta?._id;
    const listings = req.body;

    if (!Array.isArray(listings)) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("Request body must be an array.")
      );
    }

    if (!mongoose.isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, `STUDENT ID ${Messages.INVALID_ID}`);
    }

    const studentExist = await Student.findById(studentId);
    if (!studentExist) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    const latestCounsellorRecord = await PersonalCounsellor.findOne({
      studentId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const counsellorId = latestCounsellorRecord?.counsellorId ?? null;

    const normalize = (str) => str.trim().toLowerCase();

    const existingListings = await StudentUniversitySortListing.find({
      studentId,
    })
      .select("university")
      .lean();
    const existingUniversities = new Set(
      existingListings.map((entry) => normalize(entry.university))
    );

    const newEntries = [];

    for (const item of listings) {
      const { university, country, course } = item;

      if (!university || !country || !course) {
        const missingField = !university
          ? "University"
          : !country
          ? "Country"
          : "Course";

        return sendResponse(
          res,
          400,
          null,
          Messages.REQUIRED_FIELD(missingField)
        );
      }

      const normalizedUniversity = normalize(university);

      if (existingUniversities.has(normalizedUniversity)) {
        return sendResponse(
          res,
          400,
          null,
          `${university} already exists for this student.`
        );
      }

      existingUniversities.add(normalizedUniversity);

      newEntries.push({
        studentId,
        university,
        country,
        course,
        createdBy: studentId,
        counsellorId,
      });
    }

    await StudentUniversitySortListing.insertMany(newEntries);

    return sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: -  Delete  UniversitySortListing  By Id  Created Staff(Admin)
exports.deleteStaffUniversitySortListingById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const listing = await UniversitySortListing.findById(id);

    if (!listing) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    await UniversitySortListing.findByIdAndDelete(id);

    return sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Update UniversitySortListing (Admin)
exports.updateUniversitySortListingForCounsellor = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req?.meta?._id;

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const {
      universityIds,
      countryId,
      courseId,
      studentId,
      programWebsiteLink,
      duration,
      marksCriteria,
      testRequirement,
      workExpRequirement,
      location,
      intake,
      applicationDeadline,
      feesStructure,
      scholarshipDetails,
      remarks,

      sopLorEssayStatus,
      applicationOpeningDate,
      applicationDeadlines,
      applicationEntryDate,
      greGmatSatRequirement,
      greGmatSatMinScore,
      englishProficiencyTest,
      workExperienceRequirement,
      minWorkExperience,
      internshipsConsidered,
      internshipInPreferredFields,
      tuitionFee,
      lorsRequired,
      noOfLOR,
      lorType,
      sopRequired,
      sopWordLimit,
      additionalEssaysRequired,
      additionalEssaysTopic,
      resumeRequired,
      portfolioRequired,
      apsRequired,
      interviewRequired,
      interviewMode,
      applicationFee,
      onlineApplicationLink,
      livingExpenses,
      offerLetterStatus,
      typeOfOfferLetter,
      conditionalOfferLetter,
      conditionalOfferLetterAcceptanceDt,
      unconditionalOfferLetter,
      unconditionalOfferLetterAcceptanceDt,
      scholarshipsDetails,
      scholarshipAmount,
      universityContactEmail,
      admissionServiceRemark,
    } = req.body;

    if (!universityIds || !countryId || !courseId) {
      const missingField = !universityIds
        ? "University IDs"
        : !countryId
        ? "Country ID"
        : "Course ID";

      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (!Array.isArray(universityIds) || universityIds.length === 0) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("University IDs (non-empty array)")
      );
    }

    const idsToValidate = {
      studentId,
      countryId,
      courseId,
      staffId,
    };

    universityIds.forEach((id, index) => {
      idsToValidate[`universityIds[${index}]`] = id;
    });

    for (const [key, value] of Object.entries(idsToValidate)) {
      if (!mongoose.isValidObjectId(value)) {
        return sendResponse(
          res,
          400,
          null,
          `${key.toUpperCase()} ${Messages.INVALID_ID}`
        );
      }
    }

    const [studentExist, countryExist, courseExist, staffExist] =
      await Promise.all([
        Student.findById(studentId),
        Country.findById(countryId),
        FieldOfInterest.findById(courseId),
        Staff.findById(staffId),
      ]);

    if (!studentExist)
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    if (!countryExist)
      return sendResponse(res, 400, null, Messages.COUNTRY_NOT_FOUND);
    if (!courseExist)
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Course"));
    if (!staffExist)
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);

    if (
      !studentExist.counsellorId ||
      !mongoose.isValidObjectId(studentExist.counsellorId)
    ) {
      return sendResponse(res, 400, null, Messages.COUNSELLOR_NOT_FOUND);
    }

    const updatePayload = {
      studentId,
      courseId,
      universityIds,
      countryId,
      counsellorId: studentExist.counsellorId,
      updatedAt: getCurrentISTTime(),
      programWebsiteLink,
      duration,
      marksCriteria,
      testRequirement,
      workExpRequirement,
      location,
      intake,
      applicationDeadline,
      feesStructure,
      scholarshipDetails,
      remarks,
      sopLorEssayStatus,
      applicationOpeningDate,
      applicationDeadlines,
      applicationEntryDate,
      greGmatSatRequirement,
      greGmatSatMinScore,
      englishProficiencyTest,
      workExperienceRequirement,
      minWorkExperience,
      internshipsConsidered,
      internshipInPreferredFields,
      tuitionFee,
      lorsRequired,
      noOfLOR,
      lorType,
      sopRequired,
      sopWordLimit,
      additionalEssaysRequired,
      additionalEssaysTopic,
      resumeRequired,
      portfolioRequired,
      apsRequired,
      interviewRequired,
      interviewMode,
      applicationFee,
      onlineApplicationLink,
      livingExpenses,
      offerLetterStatus,
      typeOfOfferLetter,
      conditionalOfferLetter,
      conditionalOfferLetterAcceptanceDt,
      unconditionalOfferLetter,
      unconditionalOfferLetterAcceptanceDt,
      scholarshipsDetails,
      scholarshipAmount,
      universityContactEmail,
      admissionServiceRemark,
    };

    const cleanPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(
        ([_, value]) => value !== "" && value !== null && value !== undefined
      )
    );

    const updated = await UniversitySortListing.findByIdAndUpdate(
      id,
      cleanPayload,
      {
        new: true,
      }
    );

    if (!updated) return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);

    return sendResponse(res, 200, updated, Messages.DATA_UPDATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Update Scholarships Only
exports.updateScholarshipsForCounsellor = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req?.meta?._id;

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const { countryScholarship, universityScholarship, otherScholarship } =
      req.body;

    // Require at least one field to update
    if (
      countryScholarship === undefined &&
      universityScholarship === undefined &&
      otherScholarship === undefined
    ) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("At least one scholarship field")
      );
    }

    // Validate staff
    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const updatePayload = {
      countryScholarship,
      universityScholarship,
      otherScholarship,
      updatedAt: getCurrentISTTime(),
    };

    // Clean out null/empty fields
    const cleanPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(
        ([_, value]) => value !== "" && value !== null && value !== undefined
      )
    );

    const updated = await UniversitySortListing.findByIdAndUpdate(
      id,
      cleanPayload,
      { new: true }
    );

    if (!updated) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    return sendResponse(res, 200, updated, Messages.DATA_UPDATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - shortlisted status update
exports.updateShortlistStatus = async (req, res) => {
  try {
    const { _id, shortlist } = req.body;

    if (!mongoose.isValidObjectId(_id)) {
      return sendResponse(res, 400, null, "Invalid University ID.");
    }

    if (typeof shortlist !== "boolean") {
      return sendResponse(
        res,
        400,
        null,
        "Shortlist must be a boolean (true/false)."
      );
    }

    const updated = await UniversitySortListing.findOneAndUpdate(
      { _id },
      { shortlist, updatedAt: getCurrentISTTime() },
      { new: true }
    );

    if (!updated) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    return sendResponse(res, 200, null, Messages.SHORTLISTED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//end

// SECTION: - Get All UniversitySortListing Created By Staff (Admin)
exports.getAllUniversitySortListingsByStaff = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    // Get total count
    const total = await UniversitySortListing.countDocuments({
      createdByModel: "Staff",
    });

    // Fetch paginated data
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await UniversitySortListing.find({
      createdByModel: "Staff",
    })
      .populate([
        { path: "studentId", select: "username email" },
        { path: "counsellorId", select: "name" },
        { path: "createdBy", select: "name username" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const formattedData = listings.map((item) => ({
      _id: item._id,
      studentName: item?.studentId?.username ?? null,
      counsellorName: item?.counsellorId?.name ?? null,
      createdBy: item?.createdBy?.name ?? null,
      createdAt: item?.createdAt ?? null,
      updatedAt: item?.updatedAt ?? null,
    }));

    return sendResponse(
      res,
      200,
      {
        count: total,
        data: formattedData,
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//SECTION: Method to export shortlisted universities by counsellor.
exports.exportShortlistedUniversitiesByCounsellor = async (req, res) => {
  try {
    const { studentId, counsellerId } = req.query;

    const matchStage = { shortlist: true };
    if (studentId)
      matchStage.studentId = new mongoose.Types.ObjectId(studentId);
    if (counsellerId)
      matchStage.counsellerId = new mongoose.Types.ObjectId(counsellerId);

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$universityIds" },

      // University
      {
        $lookup: {
          from: "universities",
          localField: "universityIds",
          foreignField: "_id",
          as: "university",
        },
      },
      { $unwind: "$university" },

      // Country
      {
        $lookup: {
          from: "countries",
          localField: "countryId",
          foreignField: "_id",
          as: "country",
        },
      },
      { $unwind: "$country" },

      // Course
      {
        $lookup: {
          from: "fieldofinterests",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $lookup: {
          from: "staffs",
          localField: "counsellorId",
          foreignField: "_id",
          as: "counsellor",
        },
      },
      { $unwind: "$counsellor" },

      // Staff
      {
        $lookup: {
          from: "staffs",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByStaff",
        },
      },
      {
        $addFields: {
          createdBy: {
            $let: {
              vars: { s: { $arrayElemAt: ["$createdByStaff", 0] } },
              in: {
                _id: "$$s._id",
                name: "$$s.name",
              },
            },
          },
        },
      },

      {
        $project: {
          university: "$university.name",
          country: "$country.name",
          course: "$course.name",
          student: "$student.name",
          counsellor: "$counsellor.name",
          programWebsiteLink: 1,
          duration: 1,
          status: 1,
          shortlist: 1,
          sopLorEssayStatus: 1,
          applicationOpeningDate: 1,
          applicationDeadlines: 1,
          applicationEntryDate: 1,
          greGmatSatRequirement: 1,
          greGmatSatMinScore: 1,
          englishProficiencyTest: 1,
          workExperienceRequirement: 1,
          minWorkExperience: 1,
          internshipsConsidered: 1,
          internshipInPreferredFields: 1,
          tuitionFee: 1,
          lorsRequired: 1,
          noOfLOR: 1,
          lorType: 1,
          sopRequired: 1,
          sopWordLimit: 1,
          additionalEssaysRequired: 1,
          additionalEssaysTopic: 1,
          resumeRequired: 1,
          portfolioRequired: 1,
          apsRequired: 1,
          interviewRequired: 1,
          interviewMode: 1,
          applicationFee: 1,
          onlineApplicationLink: 1,
          livingExpenses: 1,
          offerLetterStatus: 1,
          typeOfOfferLetter: 1,
          conditionalOfferLetter: 1,
          conditionalOfferLetterAcceptanceDt: 1,
          unconditionalOfferLetter: 1,
          unconditionalOfferLetterAcceptanceDt: 1,
          scholarshipsDetails: 1,
          scholarshipAmount: 1,
          universityContactEmail: 1,
          admissionServiceRemark: 1,
        },
      },

      { $sort: { createdAt: -1 } },
    ];

    const rows = await UniversitySortListing.aggregate(pipeline);

    if (!rows.length) {
      return sendResponse(res, 400, null, "No shortlisted universities found");
    }

    // ----------------------------- Excel Export -----------------------------
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Shortlisted Universities");

    // Column definitions dynamically from pipeline fields
    const columns = [
      { header: "University", key: "university" },
      { header: "Country", key: "country" },
      { header: "Course", key: "course" },
      { header: "Student", key: "student" },
      { header: "Counsellor", key: "counsellor" },
      { header: "Program Website Link", key: "programWebsiteLink" },
      { header: "Duration", key: "duration" },
      { header: "Status", key: "status" },
      { header: "Shortlist", key: "shortlist" },

      // NEW FIELDS
      { header: "SOP/LOR Essay Status", key: "sopLorEssayStatus" },
      { header: "Application Opening Date", key: "applicationOpeningDate" },
      { header: "Application Deadlines", key: "applicationDeadlines" },
      { header: "Application Entry Date", key: "applicationEntryDate" },
      { header: "GRE/GMAT/SAT Requirement", key: "greGmatSatRequirement" },
      { header: "GRE/GMAT/SAT Min Score", key: "greGmatSatMinScore" },
      { header: "English Proficiency Test", key: "englishProficiencyTest" },
      {
        header: "Work Experience Requirement",
        key: "workExperienceRequirement",
      },
      { header: "Min Work Experience", key: "minWorkExperience" },
      { header: "Internships Considered", key: "internshipsConsidered" },
      {
        header: "Internship in Preferred Fields",
        key: "internshipInPreferredFields",
      },
      { header: "Tuition Fee", key: "tuitionFee" },
      { header: "LORs Required", key: "lorsRequired" },
      { header: "No. of LOR", key: "noOfLOR" },
      { header: "LOR Type", key: "lorType" },
      { header: "SOP Required", key: "sopRequired" },
      { header: "SOP Word Limit", key: "sopWordLimit" },
      { header: "Additional Essays Required", key: "additionalEssaysRequired" },
      { header: "Additional Essays Topic", key: "additionalEssaysTopic" },
      { header: "Resume Required", key: "resumeRequired" },
      { header: "Portfolio Required", key: "portfolioRequired" },
      { header: "APS Required", key: "apsRequired" },
      { header: "Interview Required", key: "interviewRequired" },
      { header: "Interview Mode", key: "interviewMode" },
      { header: "Application Fee", key: "applicationFee" },
      { header: "Online Application Link", key: "onlineApplicationLink" },
      { header: "Living Expenses", key: "livingExpenses" },
      { header: "Offer Letter Status", key: "offerLetterStatus" },
      { header: "Type of Offer Letter", key: "typeOfOfferLetter" },
      { header: "Conditional Offer Letter", key: "conditionalOfferLetter" },
      {
        header: "Conditional Offer Letter Acceptance Date",
        key: "conditionalOfferLetterAcceptanceDt",
      },
      { header: "Unconditional Offer Letter", key: "unconditionalOfferLetter" },
      {
        header: "Unconditional Offer Letter Acceptance Date",
        key: "unconditionalOfferLetterAcceptanceDt",
      },
      { header: "Scholarships Details", key: "scholarshipsDetails" },
      { header: "Scholarship Amount", key: "scholarshipAmount" },
      { header: "University Contact Email", key: "universityContactEmail" },
      { header: "Admission Service Remark", key: "admissionServiceRemark" },
    ];

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: 25,
    }));

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.height = 40;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "00999E" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 12 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add data rows
    rows.forEach((record) => {
      const row = worksheet.addRow(record);

      row.eachCell((cell) => {
        cell.alignment = {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.padding = { top: 8, bottom: 8, left: 8, right: 8 };
      });
    });

    // Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=shortlisted_universities.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
