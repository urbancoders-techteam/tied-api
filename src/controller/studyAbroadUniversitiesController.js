// File: controller/studyAbroadUniversities.js
const StudyAbroadUniversity = require("../model/studyAbroadUniversities");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const {
  s3Upload,
  deleteImageFromS3,
  getSignedUrlImage,
} = require("../helper/uploadToS3");

// ======================== CREATE ========================
exports.createStudyAbroadUniversities = async (req, res) => {
  try {
    const data = req.body;

    // Check for unique name
    const exists = await StudyAbroadUniversity.findOne({
      name: data.name?.trim(),
    });
    if (exists) {
      return sendResponse(
        res,
        400,
        null,
        "University with this name already exists."
      );
    }

    // Upload images
    if (data.image?.startsWith("data:")) {
      data.image = await s3Upload(data.image, "universities/image");
    }
    if (data.bgBanner?.startsWith("data:")) {
      data.bgBanner = await s3Upload(data.bgBanner, "universities/bgBanner");
    }

    // knowMore images
    const knowMore = Array.isArray(data.knowMore)
      ? await Promise.all(
          data.knowMore.map(async (item) => {
            let image = item.image;
            if (image?.startsWith("data:")) {
              image = await s3Upload(image, "universities/knowMore");
            }
            return { label: item.label, url: item.url, image };
          })
        )
      : [];

    // popularRecruiters logos
    const popularRecruiters = Array.isArray(data.popularRecruiters)
      ? await Promise.all(
          data.popularRecruiters.map(async (rec) => {
            let logo = rec.logo;
            if (logo?.startsWith("data:")) {
              logo = await s3Upload(logo, "universities/recruiters");
            }
            return { name: rec.name, logo };
          })
        )
      : [];

    // Scholarship
    const scholarShip =
      Array.isArray(data.scholarShip) && data.scholarShip.length
        ? data.scholarShip.map((sch) => ({
            scholarshipName: sch.scholarshipName?.trim() || "",
            scholarshipContent: Array.isArray(sch.scholarshipContent)
              ? sch.scholarshipContent.map((c) => c.trim())
              : [],
          }))
        : [];

    const payload = {
      countryName: data.countryName.trim(),
      name: data.name?.trim(),
      universitySortName: data.universitySortName?.trim() || "",
      image: data.image,
      description: data.description,
      bgBanner: data.bgBanner,
      location: data.location,
      type: data.type,
      totalEnrollment: data.totalEnrollment,
      indianStudents: data.indianStudents,
      totalStudents: data.totalStudents,
      website: data.website,
      websiteUrl: data.websiteUrl,
      why: data.why || [],
      feeStructure: data.feeStructure || [],
      scholarShip,
      knowMore,
      popularRecruiters,
      createdBy: req?.meta?._id,
    };

    await StudyAbroadUniversity.create(payload);
    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    console.error("Create Study Abroad University Error:", error);
    sendResponse(res, 400, null, error.message);
  }
};

// ======================== LIST (ADMIN) ========================
exports.listStudyAbroadUniversities = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build search query
    let matchQuery = {};

    if (search) {
      matchQuery = {
        $or: [
          { name: { $regex: search, $options: "i" } },          // 🔍 search by university name
          { universitySortName: { $regex: search, $options: "i" } }, 
          { countryName: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } }
        ],
      };
    }

    const totalCount = await StudyAbroadUniversity.countDocuments(matchQuery);

    const list = await StudyAbroadUniversity.find(
      matchQuery,
      "_id image bgBanner countryName name universitySortName location type totalEnrollment indianStudents totalStudents website websiteUrl createdAt createdBy"
    )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("createdBy", "name")
      .lean();

    const formatted = await Promise.all(
      list.map(async (item) => ({
        ...item,
        image: await getSignedUrlImage(item.image),
        bgBanner: await getSignedUrlImage(item.bgBanner),
        createdBy: item.createdBy?.name || "N/A",
      }))
    );

    sendResponse(
      res,
      200,
      { count: totalCount, data: formatted },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// ======================== GET BY ID (ADMIN) ========================
exports.getStudyAbroadUniversityById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await StudyAbroadUniversity.findById(id).lean();
    if (!data) return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);

    // Signed URLs
    data.image = await getSignedUrlImage(data.image);
    data.bgBanner = await getSignedUrlImage(data.bgBanner);

    if (Array.isArray(data.knowMore)) {
      data.knowMore = await Promise.all(
        data.knowMore.map(async (item) => ({
          ...item,
          image: item.image ? await getSignedUrlImage(item.image) : null,
        }))
      );
    }

    if (Array.isArray(data.popularRecruiters)) {
      data.popularRecruiters = await Promise.all(
        data.popularRecruiters.map(async (rec) => ({
          ...rec,
          logo: rec.logo ? await getSignedUrlImage(rec.logo) : null,
        }))
      );
    }

    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 400, null, error.message);
  }
};

// ======================== UPDATE ========================
exports.updateStudyAbroadUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.image?.startsWith("data:")) {
      updates.image = await s3Upload(updates.image, "universities/image");
    }
    if (updates.bgBanner?.startsWith("data:")) {
      updates.bgBanner = await s3Upload(
        updates.bgBanner,
        "universities/bgBanner"
      );
    }

    const knowMore = Array.isArray(updates.knowMore)
      ? await Promise.all(
          updates.knowMore.map(async (item) => {
            let image = item.image;
            if (image?.startsWith("data:")) {
              image = await s3Upload(image, "universities/knowMore");
            }
            return { label: item.label, url: item.url, image };
          })
        )
      : [];

    const popularRecruiters = Array.isArray(updates.popularRecruiters)
      ? await Promise.all(
          updates.popularRecruiters.map(async (rec) => {
            let logo = rec.logo;
            if (logo?.startsWith("data:")) {
              logo = await s3Upload(logo, "universities/recruiters");
            }
            return { name: rec.name, logo };
          })
        )
      : [];

    const scholarShip =
      Array.isArray(updates.scholarShip) && updates.scholarShip.length
        ? updates.scholarShip.map((sch) => ({
            scholarshipName: sch.scholarshipName?.trim() || "",
            scholarshipContent: Array.isArray(sch.scholarshipContent)
              ? sch.scholarshipContent.map((c) => c.trim())
              : [],
          }))
        : [];

    const payload = {
      countryName: updates?.countryName?.trim(),
      name: updates.name?.trim(),
      universitySortName: updates.universitySortName?.trim() || "",
      image: updates.image,
      description: updates.description,
      bgBanner: updates.bgBanner,
      location: updates.location,
      type: updates.type,
      totalEnrollment: updates.totalEnrollment,
      indianStudents: updates.indianStudents,
      totalStudents: updates.totalStudents,
      website: updates.website,
      websiteUrl: updates.websiteUrl,
      why: updates.why || [],
      feeStructure: updates.feeStructure || [],
      scholarShip,
      knowMore,
      popularRecruiters,
      updatedBy: req?.meta?._id,
    };

    await StudyAbroadUniversity.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    console.error("Update Study Abroad University Error:", error);
    sendResponse(res, 400, null, error.message);
  }
};

// ======================== DELETE ========================
exports.deleteStudyAbroadUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await StudyAbroadUniversity.findByIdAndDelete(id);
    if (!data) return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);

    // Delete images
    if (data.image) await deleteImageFromS3(data.image);
    if (data.bgBanner) await deleteImageFromS3(data.bgBanner);
    for (const item of data.knowMore || []) {
      if (item.image) await deleteImageFromS3(item.image);
    }
    for (const rec of data.popularRecruiters || []) {
      if (rec.logo) await deleteImageFromS3(rec.logo);
    }

    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// ======================== WEB LIST ========================
exports.webListStudyAbroadUniversities = async (req, res) => {
  try {
    const { countryName } = req.query; // get countryName from query

    // Build filter condition
    const filter = {};
    if (countryName) {
      filter.countryName = countryName;
    }

    const data = await StudyAbroadUniversity.find(
      filter,
      "_id name countryName image universitySortName"
    )
      .sort({ createdAt: -1 })
      .lean();

    const formatted = await Promise.all(
      data.map(async (item) => ({
        _id: item._id,
        countryName: item.countryName,
        name: item.name,
        universitySortName: item.universitySortName,
        image: await getSignedUrlImage(item.image),
      }))
    );

    sendResponse(res, 200, formatted, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// ======================== WEB GET BY ID ========================
exports.getStudyAbroadUniversityDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await StudyAbroadUniversity.findById(id).lean();
    if (!data) return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);

    data.image = await getSignedUrlImage(data.image);
    data.bgBanner = await getSignedUrlImage(data.bgBanner);

    if (Array.isArray(data.knowMore)) {
      data.knowMore = await Promise.all(
        data.knowMore.map(async (item) => ({
          ...item,
          image: item.image ? await getSignedUrlImage(item.image) : null,
        }))
      );
    }

    if (Array.isArray(data.popularRecruiters)) {
      data.popularRecruiters = await Promise.all(
        data.popularRecruiters.map(async (rec) => ({
          ...rec,
          logo: rec.logo ? await getSignedUrlImage(rec.logo) : null,
        }))
      );
    }

    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
