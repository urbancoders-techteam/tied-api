// File: controller/indianUniversityController.js
const IndianUniversity = require("../model/indianUniversities");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const {
  s3Upload,
  deleteImageFromS3,
  getSignedUrlImage,
} = require("../helper/uploadToS3");

//Section: create indian university (admin)
exports.createIndianUniversity = async (req, res) => {
  try {
    const data = req.body;

    // Check for unique university name
    const exists = await IndianUniversity.findOne({ name: data.name?.trim() });
    if (exists) {
      return sendResponse(
        res,
        400,
        null,
        "University with this name already exists."
      );
    }

    // Upload base64 images
    if (data.image?.startsWith("data:")) {
      data.image = await s3Upload(data.image, "indian-universities/image");
    }

    if (data.bgBanner?.startsWith("data:")) {
      data.bgBanner = await s3Upload(
        data.bgBanner,
        "indian-universities/bgBanner"
      );
    }

    if (data.locationImage?.startsWith("data:")) {
      data.locationImage = await s3Upload(
        data.locationImage,
        "indian-universities/location"
      );
    }

    if (data.feeStructure?.length) {
      for (const fee of data.feeStructure) {
        if (fee.file?.startsWith("data:")) {
          fee.file = await s3Upload(fee.file, "indian-universities/fees");
        }
      }
    }

    // Upload knowMore array if exists
    const knowMore = Array.isArray(data.knowMore)
      ? await Promise.all(
          data.knowMore.map(async (item) => {
            let image = item.image;
            if (image?.startsWith("data:")) {
              image = await s3Upload(image, "indian-universities/knowMore");
            }
            return {
              label: item.label,
              url: item.url,
              image,
            };
          })
        )
      : [];

    const payload = {
      name: data.name?.trim(),
      image: data.image,
      description: data.description,
      bgBanner: data.bgBanner,
      location: data.location,
      founded: data.founded,
      type: data.type,
      totalEnrollment: data.totalEnrollment,
      internationalStudents: data.internationalStudents,
      website: data.website,
      websiteUrl: data.websiteUrl,

      locationDetails: {
        name: data.locationName,
        shortDescription: data.locationShortDes,
        image: data.locationImage,
        locationFeatures: data.locationFeatures,
      },

      why: data.why || [],
      feeStructure: data.feeStructure || [],
      knowMore, // ✅ now stored fully

      createdBy: req?.meta?._id,
    };

    await IndianUniversity.create(payload);
    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    console.error("Create Indian University Error:", error);
    sendResponse(res, 400, null, error.message);
  }
};
// Section: get all Indian universities (admin)
exports.listIndianUniversities = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // -----------------------------------------
    // 🔍 SEARCH FILTER (same logic as staff)
    // -----------------------------------------
    let filter = {};

    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } },       // search by university name
          { location: { $regex: search, $options: "i" } },   // search by location
          { type: { $regex: search, $options: "i" } },       // search by type
          { founded: { $regex: search, $options: "i" } },    // search by founded year (string)
        ],
      };
    }

    // -----------------------------------------
    const totalCount = await IndianUniversity.countDocuments(filter);

    const list = await IndianUniversity.find(
      filter,
      "_id image bgBanner name location founded type totalEnrollment internationalStudents website websiteUrl createdAt createdBy"
    )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("createdBy", "name")
      .lean();

    const formatted = await Promise.all(
      list.map(async (item) => ({
        _id: item._id,
        name: item.name,
        location: item.location,
        founded: item.founded,
        type: item.type,
        totalEnrollment: item.totalEnrollment,
        internationalStudents: item.internationalStudents,
        website: item.website,
        websiteUrl: item.websiteUrl,
        createdAt: item.createdAt,
        createdBy: item.createdBy || "N/A",
        image: await getSignedUrlImage(item.image),
        bgBanner: await getSignedUrlImage(item.bgBanner),
      }))
    );

    sendResponse(
      res,
      200,
      {
        count: totalCount,
        data: formatted,
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// Section: get by id indian university (admin)
exports.getIndianUniversityById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await IndianUniversity.findById(id).lean();

    if (!data) return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);

    // Process image fields
    data.image = await getSignedUrlImage(data.image);
    data.bgBanner = await getSignedUrlImage(data.bgBanner);

    // Flatten locationDetails fields
    const locationDetails = data.locationDetails || {};
    const locationImage = locationDetails?.image
      ? await getSignedUrlImage(locationDetails.image)
      : null;

    // Map fee structure
    const feeStructure = Array.isArray(data.feeStructure)
      ? await Promise.all(
          data.feeStructure.map(async (fee) => ({
            nationality: fee.nationality,
            file: await getSignedUrlImage(fee.file),
          }))
        )
      : [];

    const knowMore = Array.isArray(data.knowMore)
      ? await Promise.all(
          data.knowMore.map(async (item) => ({
            ...item,
            image: item.image ? await getSignedUrlImage(item.image) : null,
          }))
        )
      : [];

    // Build response object matching form expectations
    const responsePayload = {
      ...data,
      locationName: locationDetails?.name || "",
      locationShortDes: locationDetails?.shortDescription || "",
      locationImage,
      locationFeatures: locationDetails?.locationFeatures || [],
      feeStructure,
      knowMore,
    };

    sendResponse(res, 200, responsePayload, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 400, null, error.message);
  }
};

// Section: update indian university (admin)
exports.updateIndianUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Upload updated base64 images
    if (updates.image?.startsWith("data:")) {
      updates.image = await s3Upload(
        updates.image,
        "indian-universities/image"
      );
    }

    if (updates.bgBanner?.startsWith("data:")) {
      updates.bgBanner = await s3Upload(
        updates.bgBanner,
        "indian-universities/bgBanner"
      );
    }

    if (updates.locationImage?.startsWith("data:")) {
      updates.locationImage = await s3Upload(
        updates.locationImage,
        "indian-universities/location"
      );
    }

    if (updates.feeStructure?.length) {
      for (const fee of updates.feeStructure) {
        if (fee.file?.startsWith("data:")) {
          fee.file = await s3Upload(fee.file, "indian-universities/fees");
        }
      }
    }

    // Reformat knowMore
    const knowMore = Array.isArray(updates.knowMore)
      ? await Promise.all(
          updates.knowMore.map(async (item) => {
            let image = item.image;
            if (image?.startsWith("data:")) {
              image = await s3Upload(image, "indian-universities/knowMore");
            }
            return {
              label: item.label,
              url: item.url,
              image,
            };
          })
        )
      : [];

    const payload = {
      name: updates.name?.trim(),
      image: updates.image,
      description: updates.description,
      bgBanner: updates.bgBanner,
      location: updates.location,
      founded: updates.founded,
      type: updates.type,
      totalEnrollment: updates.totalEnrollment,
      internationalStudents: updates.internationalStudents,
      website: updates.website,
      websiteUrl: updates.websiteUrl,

      locationDetails: {
        name: updates.locationName,
        shortDescription: updates.locationShortDes,
        image: updates.locationImage,
        locationFeatures: updates.locationFeatures,
      },

      why: updates.why || [],
      feeStructure: updates.feeStructure || [],
      knowMore,

      updatedBy: req?.meta?._id,
    };

    await IndianUniversity.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    console.error("Update Indian University Error:", error);
    sendResponse(res, 400, null, error.message);
  }
};

// Section: delete indian university (admin)
exports.deleteIndianUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await IndianUniversity.findByIdAndDelete(id);
    if (!data) return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);

    // Delete images if exist
    if (data.image) await deleteImageFromS3(data.image);
    if (data.bgBanner) await deleteImageFromS3(data.bgBanner);
    if (data.locationDetails?.image)
      await deleteImageFromS3(data.locationDetails.image);
    for (const fee of data.feeStructure) {
      if (fee.file) await deleteImageFromS3(fee.file);
    }

    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// Section: get indian university (web)
exports.webListIndianUniversities = async (req, res) => {
  try {
    const data = await IndianUniversity.find({}, "_id name image")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = await Promise.all(
      data.map(async (item) => ({
        _id: item._id,
        name: item.name,
        image: await getSignedUrlImage(item.image),
      }))
    );

    sendResponse(res, 200, formatted, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: get indian university by id (web)
exports.getIndianUniversityDetailsById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await IndianUniversity.findById(id).lean();
    if (!data) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    // Attach signed image URLs
    data.image = await getSignedUrlImage(data.image);
    data.bgBanner = await getSignedUrlImage(data.bgBanner);

    if (data.locationDetails?.image) {
      data.locationDetails.image = await getSignedUrlImage(
        data.locationDetails.image
      );
    }

    if (Array.isArray(data.feeStructure)) {
      data.feeStructure = await Promise.all(
        data.feeStructure.map(async (fee) => ({
          ...fee,
          file: await getSignedUrlImage(fee.file),
        }))
      );
    }

    if (Array.isArray(data.knowMore)) {
      data.knowMore = await Promise.all(
        data.knowMore.map(async (fee) => ({
          ...fee,
          image: await getSignedUrlImage(fee.image),
        }))
      );
    }

    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
