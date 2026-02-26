const { s3Upload, getSignedUrl } = require("../helper/uploadToS3");
const AdmissionService = require("../model/admissionService");
const UniversitySortListing = require("../model/UniversitySortListing");

// get all for web
const getAdmissionServiceBySortlistId = async (req, res) => {
  try {
    const { sortlistId } = req.body;
    const studentId = req?.meta?._id;

    // ✅ Check for required data
    if (!sortlistId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Missing sortlistId or student token",
      });
    }

    // Check if the sortlistId exists in the UniversitySortListing collection
    const shortlist = await UniversitySortListing.findById(sortlistId);
    if (!shortlist) {
      return res.status(404).json({
        success: false,
        message: "No university found with the provided sortlistId",
        data: null,
      });
    }

    let admissionDoc = await AdmissionService.findOne({
      sortlistId,
    }).populate({
      path: "sortlistId",
      model: "UniversitySortListing",
      populate: [
        {
          path: "universityIds",
          model: "University",
          select: "name",
        },
        {
          path: "courseId",
          model: "FieldOfInterest",
          select: "name",
        },
      ],
    });

    if (!admissionDoc) {
      return res.status(404).json({
        success: false,
        message: "No admission record found for this student and sortlistId",
      });
    }

    // ✅ Prepare signed file URLs
    const fileKeys = ["SOP", "LOR", "ESSAYS"];
    const fileUrls = {};
    for (const key of fileKeys) {
      fileUrls[key] = admissionDoc[key]
        ? await getSignedUrl(admissionDoc[key])
        : null;
    }

    const conditionalOffer = admissionDoc.conditionalOfferLetter || {};
    const unconditionalOffer = admissionDoc.unconditionalOfferLetter || {};
    const scholarship = admissionDoc.scholarshipApplication || {};
    const feedback = admissionDoc.feedback || "";

    if (conditionalOffer.file) {
      conditionalOffer.file = await getSignedUrl(conditionalOffer.file);
    }

    if (unconditionalOffer.file) {
      unconditionalOffer.file = await getSignedUrl(unconditionalOffer.file);
    }

    if (scholarship.file) {
      scholarship.file = await getSignedUrl(scholarship.file);
    }
    return res.status(200).json({
      success: true,
      message: "Admission service fetched successfully",
      data: {
        id: admissionDoc._id,
        university:
          admissionDoc.sortlistId?.universityIds
            ?.map((u) => u.name)
            .join(", ") || "-",
        course: admissionDoc.sortlistId?.courseId?.name || "-",
        ...fileUrls,
        programWebsiteLink: admissionDoc.sortlistId?.programWebsiteLink || "-",
        fillingApplication: admissionDoc.fillingApplication || null,
        conditionalOfferLetter: conditionalOffer,
        unconditionalOfferLetter: unconditionalOffer,
        scholarshipApplication: scholarship,
        feedback: feedback,
      },
    });
  } catch (error) {
    console.error("Error in getAdmissionServiceBySortlistId:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Upload & Save admission files to a shortlisted university

const uploadAdmissionFiles = async (req, res) => {
  try {
    const { sortlistId, type, file } = req.body;
    const createdBy = req?.meta?._id;

    const allowedTypes = ["SOP", "LOR", "ESSAYS"];
    if (!sortlistId || !type || !file) {
      return res.status(400).json({
        success: false,
        message: `Missing or invalid fields. 'sortlistId', 'file' or 'type'`,
        data: null,
      });
    }
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type.`,
        data: null,
      });
    }

    // Check if the sortlistId exists in the UniversitySortListing collection
    const shortlist = await UniversitySortListing.findById(sortlistId);
    if (!shortlist) {
      return res.status(404).json({
        success: false,
        message: "No university found with the provided sortlistId",
        data: null,
      });
    }

    // Upload file to S3
    const s3Key = await s3Upload(file, "admission-services");

    // Check if a document for the same sortlistId already exists
    let existingDoc = await AdmissionService.findOne({ sortlistId });

    if (existingDoc) {
      // Update the relevant type field (SOP, LOR, ESSAYS)
      existingDoc[type] = s3Key;
      existingDoc.updatedBy = createdBy;
      await existingDoc.save();
    } else {
      // Create new document
      const newDoc = new AdmissionService({
        sortlistId,
        [type]: s3Key,
        createdBy,
      });
      await newDoc.save();
      existingDoc = newDoc;
    }

    return res.status(200).json({
      success: true,
      message: `File uploaded and ${type} updated successfully.`,
      data: existingDoc,
    });
  } catch (error) {
    console.error("Upload AdmissionService failed:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while uploading admission file",
      data: null,
    });
  }
};

// List admission services for admin panel WITH SEARCH BY USERNAME
const listAdmissionServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // STEP 1: fetch all services
    const allServices = await AdmissionService.find({})
      .populate({
        path: "sortlistId",
        model: "UniversitySortListing",
        populate: [
          {
            path: "universityIds",
            model: "University",
            select: "name",
          },
          {
            path: "courseId",
            model: "FieldOfInterest",
            select: "name",
          },
        ],
      })
      .populate({
        path: "createdBy",
        model: "Student",
        select: "username",
      })
      .sort({ createdAt: -1 })
      .lean();

    // STEP 2: Filter on populated data
    const filtered = allServices.filter((doc) => {
      const query = search.toLowerCase();

      const username = doc?.createdBy?.username?.toLowerCase() || "";
      const universityNames =
        doc?.sortlistId?.universityIds
          ?.map((u) => u?.name)
          .join(", ")
          .toLowerCase() || "";

      return (
        username.includes(query) ||
        universityNames.includes(query)
      );
    });

    // STEP 3: Pagination after filtering
    const paginated = filtered.slice(skip, skip + parsedLimit);

    // STEP 4: Format output
    const formattedData = await Promise.all(
      paginated.map(async (doc) => {
        const universityNames =
          doc.sortlistId?.universityIds?.map((u) => u?.name).join(", ") || "-";

        const courseName = doc.sortlistId?.courseId?.name || "-";

        const fileUrls = {};
        for (const key of ["SOP", "LOR", "ESSAYS"]) {
          fileUrls[key] = doc[key] ? await getSignedUrl(doc[key]) : null;
        }

        return {
          id: doc._id,
          university: universityNames,
          course: courseName,
          createdBy: {
            _id: doc.createdBy?._id || null,
            username: doc.createdBy?.username || null,
          },
          feedback: doc.feedback || "",
          ...fileUrls,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Admission services listed successfully",
      data: {
        count: filtered.length,
        admissionServices: formattedData,
      },
    });
  } catch (error) {
    console.error("List Admission Services Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while listing admission services",
      data: null,
    });
  }
};

// update admission services by filling (Filling Application, Conditional Offer Letter, Unconditional Offer Letter, Scholership Application)
const updateAdmissionService = async (req, res) => {
  try {
    const {
      id,
      fillingApplication,
      conditionalOfferLetter,
      unconditionalOfferLetter,
      scholarshipApplication,
      feedback,
    } = req.body;

    const admissionDoc = await AdmissionService.findOne({ _id: id });

    if (!admissionDoc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Update filling application
    if (fillingApplication) {
      admissionDoc.fillingApplication = fillingApplication;
    }

    // Conditional Offer Letter
    if (conditionalOfferLetter) {
      if (conditionalOfferLetter.file) {
        const url = await s3Upload(
          conditionalOfferLetter.file,
          "conditional-offer"
        );
        conditionalOfferLetter.file = url;
      }
      admissionDoc.conditionalOfferLetter = conditionalOfferLetter;
    }

    // Unconditional Offer Letter
    if (unconditionalOfferLetter) {
      if (unconditionalOfferLetter.file) {
        const url = await s3Upload(
          unconditionalOfferLetter.file,
          "unconditional-offer"
        );
        unconditionalOfferLetter.file = url;
      }
      admissionDoc.unconditionalOfferLetter = unconditionalOfferLetter;
    }

    // Scholarship Application
    if (scholarshipApplication) {
      if (scholarshipApplication.file) {
        const url = await s3Upload(scholarshipApplication.file, "scholarship");
        scholarshipApplication.file = url;
      }
      admissionDoc.scholarshipApplication = scholarshipApplication;
    }
    if (feedback) {
      admissionDoc.feedback = feedback;
    }

    await admissionDoc.save();

    return res.status(200).json({
      success: true,
      message: "Admission service updated",
    });
  } catch (err) {
    console.error("Error updating admission service:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

const getAdmissionFieldById = async (req, res) => {
  try {
    const { id, type } = req.params;

    const allowedFields = [
      "fillingApplication",
      "conditionalOfferLetter",
      "unconditionalOfferLetter",
      "scholarshipApplication",
      "feedback",
    ];

    if (!allowedFields.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid field type",
      });
    }

    const admissionDoc = await AdmissionService.findById(id);

    if (!admissionDoc) {
      return res.status(404).json({
        success: false,
        message: "Admission document not found",
      });
    }

    let fieldData = admissionDoc[type] || null;

    // Wrap feedback string into an object
    if (type === "feedback" && fieldData !== null) {
      fieldData = { feedback: fieldData };
    }

    return res.status(200).json({
      success: true,
      message: `Fetched ${type} successfully`,
      data: fieldData,
    });
  } catch (error) {
    console.error("Error fetching admission field:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  uploadAdmissionFiles,
  listAdmissionServices,
  updateAdmissionService,
  getAdmissionFieldById,
  getAdmissionServiceBySortlistId,
};
