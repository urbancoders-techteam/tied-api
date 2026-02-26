const Student = require("../model/studentModel");
const Staff = require("../model/staffModel");
const Resources = require("../model/resources");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const { isValidObjectId } = require("mongoose");
const {
  s3Upload,
  getSignedUrl,
  deleteImageFromS3,
} = require("../helper/uploadToS3");
const { getCurrentISTTime } = require("../helper/lib");
const PersonalCounsellor = require("../model/personalCounsellor");
const { isSuperAdmin } = require("../controller/staffController");

// SECTION: Controller to create Resources (Admin)
exports.createResources = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { studentId, document, resourcesType } = req.body;

    if (!studentId || !document || !resourcesType) {
      let missingField = !studentId
        ? "Student ID"
        : !document
        ? "Document"
        : !resourcesType
        ? "Resources Type"
        : "Required field";

      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (!isValidObjectId(staffId) || !isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const [staff, student] = await Promise.all([
      Staff.findById(staffId),
      Student.findById(studentId),
    ]);

    if (!staff || !student) {
      const message = !staff ? "Staff" : "Student";
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA(message));
    }

    const existingResource = await Resources.findOne({
      studentId,
      resourcesType: resourcesType,
    });
    if (existingResource) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }

    if (!document.startsWith("data:application/pdf;base64,")) {
      return sendResponse(res, 400, null, Messages.INVALID_BASE64);
    }

    const uploadedDocumentUrl = await s3Upload(document, "pdf");

    await Resources.create({
      studentId,
      document: uploadedDocumentUrl,
      resourcesType: resourcesType,
      createdBy: staffId,
      createdAt: getCurrentISTTime(),
      updatedAt: getCurrentISTTime(),
    });

    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Controller to update Resources (Admin)
exports.updateResources = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;
    const { studentId, document, resourcesType } = req.body;

    if (!id || !studentId || !document || !resourcesType) {
      const missingField = !id
        ? "Resource ID"
        : !studentId
        ? "Student ID"
        : !document
        ? "Document"
        : !resourcesType
        ? "Resources Type"
        : "Required field";

      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (
      !isValidObjectId(staffId) ||
      !isValidObjectId(id) ||
      !isValidObjectId(studentId)
    ) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const [staff, student] = await Promise.all([
      Staff.findById(staffId),
      Student.findById(studentId),
    ]);

    if (!staff || !student) {
      const message = !staff ? "Staff" : "Student";
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA(message));
    }
    const checkResourse = await Resources.findById(id);
    if (!checkResourse) sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    const existingResource = await Resources.findOne({
      studentId,
      resourcesType,
      _id: { $ne: id },
    });

    if (existingResource) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }

    let uploadedDocumentUrl = checkResourse.document;
    if (
      document &&
      typeof document === "string" &&
      document.startsWith("data:application/pdf;base64,")
    ) {
      uploadedDocumentUrl = await s3Upload(document, "pdf");
    }

    const updatedResource = await Resources.findByIdAndUpdate(
      id,
      {
        studentId,
        document: uploadedDocumentUrl,
        resourcesType,
        updatedBy: staffId,
        updatedAt: getCurrentISTTime(),
      },
      { new: true }
    );

    if (!updatedResource) {
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Resources"));
    }

    return sendResponse(res, 200, null, Messages.UPDATED_DATA("Resources"));
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Get all Resources (Admin)
exports.getAllResources = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit, studentId } = req.query;

    if (!isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA("Staff"));
    }

    const isSuper = await isSuperAdmin(staffId);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    let filter = {};

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

      filter.studentId = { $in: studentIds };

      if (studentId) {
        filter.studentId = studentId;
      }
    }

    const count = await Resources.countDocuments(filter);

    const resources = await Resources.find(filter)
      .populate([
        { path: "studentId", select: "username" },
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .skip(skip)
      .limit(parsedLimit)
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const formattedData = await Promise.all(
      resources.map(async (item) => {
        const counsellorData = await PersonalCounsellor.findOne({
          studentId: item.studentId?._id,
        })
          .populate({ path: "counsellorId", select: "name" })
          .lean();

        return {
          _id: item._id,
          studentId: item.studentId?._id ?? null,
          studentName: item.studentId?.username ?? null,
          resourcesType: item.resourcesType ?? null,
          documentUrl: item.document ? await getSignedUrl(item.document) : null,
          counsellorName: counsellorData?.counsellorId?.name ?? null,
          counsellorId: counsellorData?.counsellorId?._id ?? null,
          createdBy: item.createdBy?.name ?? null,
          updatedBy: item.updatedBy?.name ?? null,
          updatedAt: item.updatedAt,
        };
      })
    );

    sendResponse(
      res,
      200,
      { count, data: formattedData },
      Messages.DATA_FETCHED
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Get Resource By Id (Admin)
exports.getResourceById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    if (!isValidObjectId(staffId) || !isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const resource = await Resources.findById(id)
      .populate([
        { path: "studentId", select: "username" },
        { path: "updatedBy", select: "name username" },
      ])
      .select("-__v -updatedBy -createdAt -updatedAt -createdBy ")
      .lean();

    if (!resource) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    resource.document = await getSignedUrl(resource.document);

    sendResponse(res, 200, resource, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Delete Resource By Id (Admin)
exports.deleteResourceById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    if (!isValidObjectId(staffId) || !isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const [staff, resource] = await Promise.all([
      Staff.findById(staffId),
      Resources.findById(id),
    ]);

    if (!staff || !resource) {
      const message = !staff
        ? Messages.STAFF_NOT_FOUND
        : Messages.DATA_NOT_FOUND;
      return sendResponse(res, 400, null, message);
    }

    if (resource.document) {
      await deleteImageFromS3(resource.document);
    }

    await Resources.findByIdAndDelete(id);

    sendResponse(res, 200, null, Messages.DELETED_DATA("Resources"));
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Get all Resources (Student/Web)
exports.getAllResourcesForStudent = async (req, res) => {
  try {
    const studentId = req?.meta?._id?.toString();
    const { page, limit } = req.query;
    console.log("studentId", studentId);

    if (!studentId || !isValidObjectId(studentId)) {
      console.error("Invalid studentId received:", studentId);
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }
    const studentName = student.name;

    const personalCounsellor = await PersonalCounsellor.findOne({
      studentId,
    }).populate({
      path: "counsellorId",
      select: "name",
    });

    const counsellorId = personalCounsellor?.counsellorId?._id ?? null;
    const counsellorName = personalCounsellor?.counsellorId?.name ?? null;

    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const parsedLimit = limit ? parseInt(limit) : 0;

    const query = { studentId };
    const count = await Resources.countDocuments(query);

    let resourceQuery = Resources.find(query)
      .populate([
        { path: "updatedBy", select: "name" },
        { path: "createdBy", select: "name" },
      ])
      .sort({ updatedAt: -1 })
      .lean();

    if (parsedLimit > 0) {
      resourceQuery = resourceQuery.skip(skip).limit(parsedLimit);
    }

    const resources = await resourceQuery.exec();

    const data = await Promise.all(
      resources.map(async (item) => ({
        _id: item._id,
        studentId,
        studentName,
        counsellorId,
        counsellorName,
        resourcesType: item.resourcesType ?? null,
        documentUrl: item.document ? await getSignedUrl(item.document) : null,
        createdBy: item.createdBy?.name ?? null,
        updatedBy: item.updatedBy?.name ?? null,
        updatedAt: item.updatedAt,
      }))
    );

    return sendResponse(res, 200, { count, data }, Messages.DATA_FETCHED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
