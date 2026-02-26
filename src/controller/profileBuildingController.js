const ProfileBuilding = require("../model/profileBuilding");
const Staff = require("../model/staffModel");
const PersonalCounsellor = require("../model/personalCounsellor");
const Student = require("../model/studentModel");
const { Messages } = require("../helper/message");
const mongoose = require("mongoose");
const { sendResponse } = require("../helper/response");
const { getCurrentISTTime } = require("../helper/lib");
const { isSuperAdmin } = require("../controller/staffController");
const {
  s3Upload,
  getSignedUrlImage,
  deleteImageFromS3,
  getSignedUrl,
} = require("../helper/uploadToS3");

// SECTION: - Profile Building (Student)
exports.createProfileBuilding = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const {
      institute,
      currentCourse,
      name,
      city,
      intake,
      careerGoal,
      academicPreparation,
      researchExperience,
      projects,
      workExperience,
      extracurricularActivites,
      skillsAndCompetencies,
      onlinePresence,
      financialPosition,
      proofOfWork,
      resume,
    } = req.body;

    if (
      !institute ||
      !currentCourse ||
      !name ||
      !city ||
      !careerGoal ||
      !academicPreparation ||
      !resume
    ) {
      const missingField = !institute
        ? "Institute"
        : !currentCourse
        ? "Current Course"
        : !name
        ? "Name"
        : !city
        ? "City"
        : !careerGoal
        ? "Career Goal"
        : !academicPreparation
        ? "Academic Preparation"
        : "Resume";

      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    const requiredFieldsMap = {
      tenthOverallAggregate: "Tenth Overall Aggregate",
      twelfthOverallAggregate: "Twelfth Overall Aggregate",
    };

    const missingField = Object.entries(requiredFieldsMap).find(
      ([key]) =>
        !(academicPreparation && Object.hasOwn(academicPreparation, key))
    );

    if (missingField) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField[1])
      );
    }

    const profile = await ProfileBuilding.findOne({ createdBy: userId });
    if (profile) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }

    if (!resume.startsWith("data:application/pdf;base64,")) {
      throw new Error(Messages.INVALID_BASE64);
    }
    const uploadedResumeUrl = await s3Upload(resume, "pdf");

    if (!mongoose.isValidObjectId(userId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const checkStudent = await Student.findById(userId);
    if (!checkStudent) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    await ProfileBuilding.create({
      name,
      city,
      institute,
      currentCourse,
      careerGoal,
      academicPreparation,
      researchExperience,
      projects,
      intake,
      workExperience,
      extracurricularActivites,
      skillsAndCompetencies,
      onlinePresence,
      financialPosition,
      proofOfWork,
      resume: uploadedResumeUrl,
      createdBy: userId,
      updatedBy: userId,
      createdAt: getCurrentISTTime(),
      updatedAt: getCurrentISTTime(),
    });

    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    console.log(error);

    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Update Profile Building (Student)
exports.updateProfileBuilding = async (req, res) => {
  try {
    const userId = req?.meta?._id;

    const {
      institute,
      currentCourse,
      name,
      city,
      intake,
      careerGoal,
      academicPreparation,
      researchExperience,
      projects,
      workExperience,
      extracurricularActivites,
      skillsAndCompetencies,
      onlinePresence,
      financialPosition,
      proofOfWork,
      resume,
    } = req.body;

    if (
      !institute ||
      !currentCourse ||
      !name ||
      !city ||
      !careerGoal ||
      !academicPreparation
    ) {
      const missingField = !institute
        ? "Institute"
        : !currentCourse
        ? "Current Course"
        : !name
        ? "Name"
        : !city
        ? "City"
        : !careerGoal
        ? "Career Goal"
        : "Academic Preparation";

      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }
    const requiredFieldsMap = {
      tenthOverallAggregate: "Tenth Overall Aggregate",
      twelfthOverallAggregate: "Twelfth Overall Aggregate",
    };

    const missingField = Object.entries(requiredFieldsMap).find(
      ([key]) =>
        !(academicPreparation && Object.hasOwn(academicPreparation, key))
    );

    if (missingField) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField[1])
      );
    }

    if (!mongoose.isValidObjectId(userId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const profile = await ProfileBuilding.findOne({ createdBy: userId });
    if (!profile) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    let uploadedResumeUrl = profile.resume;

    if (resume && resume.startsWith("data:application/pdf;base64,")) {
      if (profile.resume) {
        await deleteImageFromS3(profile.resume);
      }

      uploadedResumeUrl = await s3Upload(resume, "pdf");
    }

    const updateData = {
      name,
      city,
      institute,
      currentCourse,
      careerGoal,
      academicPreparation,
      researchExperience,
      projects,
      intake,
      workExperience,
      extracurricularActivites,
      skillsAndCompetencies,
      onlinePresence,
      financialPosition,
      proofOfWork,
      resume: uploadedResumeUrl,
      updatedBy: userId,
      updatedAt: getCurrentISTTime(),
    };

    await ProfileBuilding.findByIdAndUpdate(profile._id, updateData, {
      new: true,
    });

    sendResponse(res, 200, null, Messages.DATA_UPDATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get Profile Building By Id (Student)
exports.getProfileBuildingById = async (req, res) => {
  try {
    const userId = req?.meta?._id;

    if (!mongoose.isValidObjectId(userId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const userExist = await Student.findById(userId);
    if (!userExist) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    const profile = await ProfileBuilding.findOne({ createdBy: userId }).select(
      "-__v -createdBy -updatedBy -createdAt -updatedAt"
    );

    if (!profile) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    if (profile?.resume) {
      profile.resume = await getSignedUrlImage(profile.resume);
    }

    sendResponse(res, 200, profile, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All Profile Building By Counsellor  (Admin)
exports.getAllProfileBuildingAssignedToCounsellor = async (req, res) => {
  try {
    const counsellorId = req?.meta?._id;
    const { page = 1, limit = 10, studentId, search = "" } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    if (!mongoose.isValidObjectId(counsellorId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(counsellorId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const isSuper = await isSuperAdmin(counsellorId);
    let filter = {};

    if (isSuper) {
      if (studentId) filter.createdBy = studentId;
    } else {
      const assignedRecords = await PersonalCounsellor.find({
        counsellorId,
      }).select("studentId");

      const studentIds = [
        ...new Set(assignedRecords.map((rec) => rec.studentId.toString())),
      ];

      filter.createdBy = { $in: studentIds };

      if (studentId) filter.createdBy = studentId;
    }

    // STEP 1: Fetch all records
    const allRecords = await ProfileBuilding.find(filter)
      .populate([{ path: "createdBy", select: "username" }])
      .sort({ createdAt: -1 })
      .lean();

    // STEP 2: Apply search AFTER populate
    const query = search.toLowerCase();

    const filtered = allRecords.filter((item) => {
      const studentName =
        item?.createdBy?.username?.toLowerCase() ?? "";

      const city = item?.city?.toLowerCase() ?? "";

      return (
        studentName.includes(query) ||
        city.includes(query)
      );
    });

    // STEP 3: Pagination AFTER filtering
    const paginated = filtered.slice(skip, skip + parsedLimit);

    // STEP 4: Format response
    const formattedData = await Promise.all(
      paginated.map(async (item) => ({
        _id: item._id,
        studentName: item?.createdBy?.username ?? null,
        counsellorName: staffExist.name,
        status: item?.status ?? null,
        institute: item?.institute ?? null,
        currentCourse: item?.currentCourse ?? null,
        name: item?.name ?? null,
        city: item?.city ?? null,
        resume: item.resume ? await getSignedUrl(item.resume) : null,
        createdAt: item?.createdAt ?? null,
        updatedAt: item?.updatedAt ?? null,
      }))
    );

    return sendResponse(
      res,
      200,
      {
        count: filtered.length,
        formattedData,
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Get Profile Building By Id (Staff)
exports.getProfileBuildingByIdAmin = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const profile = await ProfileBuilding.findById(id)
      .populate([
        { path: "createdBy", select: "name username" },
        { path: "updatedBy", select: "name username" },
      ])
      .select("-__v -updatedBy -createdAt -updatedAt -createdBy")
      .lean();

    if (!profile) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    if (profile.resume) {
      profile.resume = await getSignedUrl(profile.resume);
    }

    sendResponse(res, 200, profile, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Add feedback remark & timeline by Counsellor
exports.addProfileFeedbackByCounsellor = async (req, res) => {
  try {
    const counsellorId = req?.meta?._id;
    const { studentId, remark, timeline } = req.body;

    if (!remark || !timeline) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("Remark and Timeline")
      );
    }

    const staff = await Staff.findById(counsellorId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    const profile = await ProfileBuilding.findOne({ createdBy: studentId });
    if (!profile) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    profile.remark = remark;
    profile.timeline = new Date(timeline);
    profile.updatedBy = counsellorId;
    profile.updatedAt = getCurrentISTTime();
    await profile.save();

    sendResponse(res, 200, null, "Feedback submitted successfully.");
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
