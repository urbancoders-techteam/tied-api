const DocumentManagement = require("../model/documentManagement");
const Student = require("../model/studentModel");
const PersonalCounsellor = require("../model/personalCounsellor");
const Staff = require("../model/staffModel");
const { Messages } = require("../helper/message");
const mongoose = require("mongoose");
const { getCurrentISTTime } = require("../helper/lib");

const { sendResponse } = require("../helper/response");
const StudentDocumentManagement = require("../model/studentDocumentManagement");
const { getSignedUrl } = require("../helper/uploadToS3");
const { isSuperAdmin } = require("../controller/staffController");

// SECTION: - Create Document Management (Admin)
exports.createDocumentManagement = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const {
      studentId,
      academicDocuments,
      standardisedTestScores,
      applicationDocuments,
      identityDocuments,
      financialDocuments,
      additionalDocuments,
      status,
    } = req.body;

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    if (!Array.isArray(studentId) || studentId.length === 0) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("studentId"));
    }

    for (const id of studentId) {
      if (!mongoose.isValidObjectId(id)) {
        return sendResponse(
          res,
          400,
          null,
          `STUDENT_ID ${Messages.INVALID_ID}`
        );
      }

      const studentExists = await Student.findById(id);
      if (!studentExists) {
        return sendResponse(
          res,
          400,
          null,
          Messages.STUDENT_NOT_FOUND_BY_ID(id)
        );
      }
    }

    const existingDocumentManagements = await DocumentManagement.find({
      studentId: { $in: studentId },
    });

    if (existingDocumentManagements.length > 0) {
      return sendResponse(
        res,
        400,
        null,
        Messages.DOCUMENT_MANAGEMENT_ALREADY_EXISTS
      );
    }

    const documentManagementEntries = studentId.map((id) => ({
      studentId: id,
      academicDocuments,
      standardisedTestScores,
      applicationDocuments,
      identityDocuments,
      financialDocuments,
      additionalDocuments,
      status,
      createdBy: staffId,
      createdAt: getCurrentISTTime(),
      updatedAt: getCurrentISTTime(),
    }));

    await DocumentManagement.insertMany(documentManagementEntries);

    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Update Document Management (Admin)
exports.updateDocumentManagement = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    const {
      studentId,
      academicDocuments,
      standardisedTestScores,
      applicationDocuments,
      identityDocuments,
      financialDocuments,
      additionalDocuments,
      status,
    } = req.body;

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    if (!studentId) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("studentId"));
    }

    if (!mongoose.isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, `STUDENT_ID ${Messages.INVALID_ID}`);
    }

    const studentExists = await Student.findById(studentId);
    if (!studentExists) {
      return sendResponse(
        res,
        400,
        null,
        Messages.STUDENT_NOT_FOUND_BY_ID(studentId)
      );
    }

    const documentManagement = await DocumentManagement.findById(id);
    const studentDocumentManagement = await StudentDocumentManagement.findOne({
      studentId,
    });

    if (!documentManagement && !studentDocumentManagement) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    let updatedDocument = null;
    if (documentManagement) {
      updatedDocument = await DocumentManagement.findByIdAndUpdate(
        id,
        {
          studentId,
          academicDocuments,
          standardisedTestScores,
          applicationDocuments,
          identityDocuments,
          financialDocuments,
          additionalDocuments,
          status,
          updatedBy: staffId,
          updatedAt: getCurrentISTTime(),
        },
        { new: true }
      );
    }

    if (studentDocumentManagement) {
      await StudentDocumentManagement.findOneAndUpdate(
        { studentId },
        { status, updatedBy: staffId, updatedAt: getCurrentISTTime() }
      );
    }

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All Document Management (Admin)
exports.getAllDocumentManagement = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit, studentId, status, search } = req.query;

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const isSuper = await isSuperAdmin(staffId);

    let filter = {};

    // If not super admin, filter by assigned students
    if (!isSuper) {
      const assignments = await PersonalCounsellor.find({ counsellorId: staffId }).lean();
      const assignedStudentIds = assignments.map(a => a.studentId?.toString());

      if (assignedStudentIds.length === 0) {
        return sendResponse(res, 200, { count: 0, data: [] }, Messages.DATA_RETRIVED);
      }

      filter.studentId = { $in: assignedStudentIds };
    }

    // Filter by specific studentId
    if (studentId) {
      filter.studentId = studentId;
    }

    // Filter by status
    if (status !== undefined) {
      filter.status = status;
    }

    // --- SEARCH BY STUDENT NAME ---
    if (search) {
      // Find matching students
      const matchedStudents = await Student.find({ username: { $regex: search, $options: "i" } }).select("_id");
      const matchedStudentIds = matchedStudents.map(s => s._id);
      filter.studentId = filter.studentId
        ? { $in: filter.studentId.$in.filter(id => matchedStudentIds.includes(id)) }
        : { $in: matchedStudentIds };
    }

    // Count total documents
    const count = await DocumentManagement.countDocuments(filter);

    let query = DocumentManagement.find(filter)
      .populate([
        { path: "studentId", select: "username" },
        { path: "createdBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      query = query.skip(skip).limit(parseInt(limit));
    }

    const documents = await query.exec();

    // Map counsellor info
    const studentIds = documents.map(doc => doc.studentId?._id?.toString()).filter(Boolean);

    const counsellorMappings = await PersonalCounsellor.find({
      studentId: { $in: studentIds },
    })
      .populate({ path: "counsellorId", select: "name" })
      .lean();

    const counsellorMap = {};
    counsellorMappings.forEach(entry => {
      const studentIdStr = entry.studentId?.toString();
      if (studentIdStr) {
        counsellorMap[studentIdStr] = {
          id: entry.counsellorId?._id ?? null,
          name: entry.counsellorId?.name ?? null,
        };
      }
    });

    const categories = [
      "academicDocuments",
      "standardisedTestScores",
      "applicationDocuments",
      "identityDocuments",
      "financialDocuments",
      "additionalDocuments",
    ];

    const data = documents.map(doc => {
      const uploadedCategories = [];

      categories.forEach(category => {
        if (doc[category] && typeof doc[category] === "object" && Object.keys(doc[category]).length > 0) {
          uploadedCategories.push(category);
        }
      });

      const studentIdStr = doc.studentId?._id?.toString();
      const counsellor = counsellorMap[studentIdStr] || {};

      return {
        _id: doc._id,
        studentId: doc.studentId?._id ?? null,
        studentName: doc.studentId?.username ?? null,
        personalCounsellorId: counsellor.id,
        personalCounsellorName: counsellor.name,
        uploadedCategories,
        createdBy: doc.createdBy?.name ?? null,
        status: doc.status ?? null,
        createdAt: doc.createdAt,
      };
    });

    const totalPage = Math.ceil(count / (parseInt(limit) || 1));

    return sendResponse(res, 200, { count, totalPage, currentPage: parseInt(page) || 1, data }, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get Document Management by Id (Admin)
exports.getDocumentManagementById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const documentManagement = await DocumentManagement.findById(id)
      .populate({ path: "studentId", select: "username" })
      .select("-createdBy -updatedBy -createdAt -updatedAt -__v")
      .lean();

    if (!documentManagement) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    sendResponse(res, 200, documentManagement, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Delete DocumentManagement by Id (Admin)
exports.deleteDocumentManagementById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const documentManagement = await DocumentManagement.findOne({
      studentId: id,
    });
    const studentDocumentManagement = await StudentDocumentManagement.findOne({
      studentId: id,
    });

    if (!documentManagement && !studentDocumentManagement) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    if (documentManagement) {
      await DocumentManagement.findByIdAndDelete(documentManagement._id);
    }

    if (studentDocumentManagement) {
      await StudentDocumentManagement.findByIdAndDelete(
        studentDocumentManagement._id
      );
    }

    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION -  Web - Get Document Management Details
exports.getDocumentManagementWeb = async (req, res) => {
  try {
    const studentId = req?.meta?._id;

    const checkStudent = await Student.findById(studentId).select("username");
    if (!checkStudent) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    const data = await DocumentManagement.findOne({
      studentId: studentId,
      status: true,
    }).lean();

    const formattedData = {
      _id: data?._id,
      studentId: studentId,
      studentName: checkStudent.username ?? null,
      status: data?.status ?? null,
      ...(data?.status
        ? {
            documents: {
              academicDocuments: data?.academicDocuments ?? {},
              standardisedTestScores: data?.standardisedTestScores ?? {},
              applicationDocuments: data?.applicationDocuments ?? {},
              identityDocuments: data?.identityDocuments ?? {},
              financialDocuments: data?.financialDocuments ?? {},
              additionalDocuments: data?.additionalDocuments ?? {},
            },
          }
        : { documents: {} }),
    };

    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION -  Admin - Get Document Management Detail of Student
exports.getStudentDocumentByIdAdmin = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { studentId } = req.params;

    if (!studentId) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("Student Id")
      );
    }

    if (
      !mongoose.isValidObjectId(studentId) ||
      !mongoose.isValidObjectId(staffId)
    ) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const [student, staff] = await Promise.all([
      Student.findById(studentId),
      Staff.findById(staffId),
    ]);

    if (!student || !staff) {
      const message = !student
        ? Messages.STUDENT_NOT_FOUND
        : Messages.STAFF_NOT_FOUND;
      return sendResponse(res, 400, null, message);
    }

    const document = await StudentDocumentManagement.findOne({
      studentId: student._id,
    });

    if (!document) {
      return sendResponse(
        res,
        400,
        null,
        Messages.STUDENT_DOCUMENT_MANAGEMENT_NOT_CREATED_YET
      );
    }

    const generateSignedUrls = async (docSection) => {
      if (!docSection) return {};

      const plainSection = docSection.toObject();
      const updatedSection = {};

      for (const key in plainSection) {
        const entry = plainSection[key];

        if (entry?.url) {
          const signed = await getSignedUrl(entry.url);
          updatedSection[key] = { ...entry, url: signed };
        } else {
          updatedSection[key] = entry;
        }
      }

      return updatedSection;
    };

    const finalDocument = {
      academicDocuments: await generateSignedUrls(document.academicDocuments),
      standardisedTestScores: await generateSignedUrls(
        document.standardisedTestScores
      ),
      applicationDocuments: await generateSignedUrls(
        document.applicationDocuments
      ),
      identityDocuments: await generateSignedUrls(document.identityDocuments),
      financialDocuments: await generateSignedUrls(document.financialDocuments),
      additionalDocuments: await generateSignedUrls(
        document.additionalDocuments
      ),
    };

    const data = {
      studentId: document.studentId,
      studentName: student.username,
      status: document.status ?? null,
      documents: finalDocument,
    };

    return sendResponse(res, 200, data, Messages.DATA_FETCHED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
