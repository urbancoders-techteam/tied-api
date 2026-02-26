const StudentDocumentManagement = require("../model/studentDocumentManagement");
const Student = require("../model/studentModel");
const Staff = require("../model/staffModel");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const mongoose = require("mongoose");
const {
  s3Upload,
  deleteImageFromS3,
  getSignedUrl,
} = require("../helper/uploadToS3");

//SECTION - create or update student document
exports.uploadSingleDocument = async (req, res) => {
  try {
    const studentId = req.meta?.id;
    const userId = studentId;

    // Validate studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    // Define categories
    const categories = [
      "academicDocuments",
      "standardisedTestScores",
      "applicationDocuments",
      "identityDocuments",
      "financialDocuments",
      "additionalDocuments",
    ];

    // Find category in request body
    const categoryKey = categories.find((key) => req.body[key]);
    if (!categoryKey) {
      return sendResponse(res, 400, null, Messages.INVALID_DOC_CATEGORY);
    }

    const docObject = req.body[categoryKey];
    const docField = Object.keys(docObject)[0];
    let docData = docObject[docField];

    // Validate document structure
    if (
      !docData ||
      typeof docData !== "object" ||
      typeof docData.document !== "boolean" ||
      typeof docData.url !== "string" ||
      typeof docData.title !== "string"
    ) {
      return sendResponse(res, 400, null, Messages.INVALID_FORMAT);
    }

    // Fetch existing document profile to get old URL if any
    const profile = await StudentDocumentManagement.findOne({ studentId });

    // If the category field is null, initialize it
    if (profile && profile[categoryKey] === null) {
      await StudentDocumentManagement.updateOne(
        { studentId },
        { $set: { [categoryKey]: {} } }
      );
    }

    if (docData.url.startsWith("data:")) {
      const oldFileUrl = profile?.[categoryKey]?.[docField]?.url;
      if (oldFileUrl) {
        await deleteImageFromS3(oldFileUrl);
      }

      const match = docData.url.match(/^data:(.+);base64,/);
      const fileType = match ? match[1].split("/")[1] : "pdf";
      docData.url = await s3Upload(docData.url, fileType);
    }

    const update = {
      [`${categoryKey}.${docField}`]: docData,
      updatedBy: userId,
    };

    await StudentDocumentManagement.findOneAndUpdate(
      { studentId },
      {
        $set: update,
        $setOnInsert: { studentId, createdBy: userId },
      },
      { new: true, upsert: true }
    );

    return sendResponse(res, 200, null, Messages.UPLOAD_DONE);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//SECTION - get all student document
exports.getAllStudentDocumentManagement = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit, studentId } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    // Verify staff existence
    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    // Build filter
    const filter = {};
    if (studentId) {
      filter.studentId = studentId;
    }

    // Count total documents
    const count = await StudentDocumentManagement.countDocuments(filter);

    // Fetch documents with necessary fields
    const documents = await StudentDocumentManagement.find(filter)
      .populate({ path: "studentId", select: "username" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    // Define document categories
    const categories = [
      "academicDocuments",
      "standardisedTestScores",
      "applicationDocuments",
      "identityDocuments",
      "financialDocuments",
      "additionalDocuments",
    ];

    // Format response
    const formattedData = documents.map((doc) => {
      const uploadedCategories = [];

      categories.forEach((category) => {
        if (
          doc[category] &&
          typeof doc[category] === "object" &&
          Object.keys(doc[category]).length > 0
        ) {
          uploadedCategories.push(category);
        }
      });

      return {
        studentId: doc.studentId?._id ?? null,
        studentName: doc.studentId?.username ?? null,
        uploadedCategories,
        createdAt: doc.createdAt ?? null,
      };
    });

    return sendResponse(
      res,
      200,
      {
        count,
        formattedData,
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.getStudentDocumentById = async (req, res) => {
  try {
    const studentId = req?.meta?._id;

    if (!mongoose.isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);
    }

    const document = await StudentDocumentManagement.findOne({
      studentId: student._id,
    });
    if (!document) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    const generateSignedUrls = async (docSection) => {
      if (!docSection) return {};
      const updatedSection = {};
      const plainSection = docSection.toObject();

      for (const key in plainSection) {
        const entry = plainSection[key];
        if (entry?.url) {
          updatedSection[key] = {
            ...entry,
            url: await getSignedUrl(entry.url),
          };
        } else {
          updatedSection[key] = entry;
        }
      }

      return updatedSection;
    };

    const finalDocument = {
      academicDocuments: await generateSignedUrls(document.academicDocuments),
      standardisedTestScores: await generateSignedUrls(document.standardisedTestScores),
      applicationDocuments: await generateSignedUrls(document.applicationDocuments),
      identityDocuments: await generateSignedUrls(document.identityDocuments),
      financialDocuments: await generateSignedUrls(document.financialDocuments),
      additionalDocuments: await generateSignedUrls(document.additionalDocuments),
    };

    const data = {
      studentId: document.studentId,
      documents: finalDocument,
      status: document.status,
    };

    return sendResponse(res, 200, data, Messages.DATA_FETCHED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//SECTION - delete document
exports.deleteSingleDocument = async (req, res) => {
  try {
    const studentId = req.meta?.id;
    const userId = studentId;
    const { category, field } = req.params;

    // Validate studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    // Validate category
    const validCategories = [
      "academicDocuments",
      "standardisedTestScores",
      "applicationDocuments",
      "identityDocuments",
      "financialDocuments",
      "additionalDocuments",
    ];

    if (!validCategories.includes(category)) {
      return sendResponse(res, 400, null, Messages.INVALID_DOC_CATEGORY);
    }

    // Fetch the student's document profile
    const profile = await StudentDocumentManagement.findOne({ studentId });

    if (!profile || !profile[category] || !profile[category][field]) {
      return sendResponse(res, 400, null, Messages.DOCUMENT_NOT_FOUND);
    }

    // Delete the file from S3 if URL exists
    const fileUrl = profile[category][field].url;
    if (fileUrl) {
      await deleteImageFromS3(fileUrl);
    }

    // Remove the specific document field
    await StudentDocumentManagement.updateOne(
      { studentId },
      {
        $unset: {
          [`${category}.${field}`]: "",
        },
        $set: {
          updatedBy: userId,
        },
      }
    );

    return sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
