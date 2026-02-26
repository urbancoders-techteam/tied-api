// controllers/immersionCountryController.js

const ImmersionCountry = require("../model/immersionCountries");
const Staff = require("../model/staffModel");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const {
  s3Upload,
  getSignedUrlImage,
  deleteImageFromS3,
} = require("../helper/uploadToS3");
const mongoose = require("mongoose");

// --- CREATE immersion country (admin)
exports.createImmersionCountry = async (req, res) => {
  try {
    const data = req.body;

    const name = data?.name?.trim();
    const existing = await ImmersionCountry.findOne({ name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An immersion country named ${name} already exists`,
      });
    }

    const image = data.image && (await s3Upload(data.image, "immersion/image"));
    const flag = data.flag && (await s3Upload(data.flag, "immersion/flag"));
    const universityImage =
      data.universityImage &&
      (await s3Upload(data.universityImage, "immersion/university"));
    const companyImage =
      data.companyImage &&
      (await s3Upload(data.companyImage, "immersion/company"));

    const keyObjectives = await Promise.all(
      (data.keyObjectives || []).map(async (obj) => ({
        icon: obj.icon && (await s3Upload(obj.icon, "immersion/keyObjectives")),
        description: obj.description,
      }))
    );
    const culturalExploration = await Promise.all(
      (data.culturalExploration || [])
        .filter((img) => !!img)
        .map(
          async (img) => await s3Upload(img, "immersion/culturalExploration")
        )
    );

    console.log("culturalExploration", culturalExploration);
    const payload = {
      immersionZone: data.immersionZone,
      name: data.name,
      description: data.description,
      keyObjectives,
      programOverview: data.programOverview || [],
      universityTitle: data.universityTitle,
      universityShortDes: data.universityShortDes,
      universityFeatures: data.universityFeatures || [],
      universityImage,
      companyTitle: data.companyTitle,
      companyShortDes: data.companyShortDes,
      companyFeatures: data.companyFeatures || [],
      companyImage,
      image,
      flag,
      culturalExploration,
      createdBy: req.meta?._id,
    };

    await ImmersionCountry.create(payload);
    return sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (err) {
    console.error("Immersion Creation Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

// --- LIST immersion countries (admin)
exports.listImmersionCountries = async (req, res) => {
  try {
    const staffId = req.meta?._id;
    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const { page = 1, limit = 10, search = "" } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // ------------------------------
    //       SEARCH FILTER
    // ------------------------------
    let filter = {};

    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } },         
          { immersionZone: { $regex: search, $options: "i" } }, 
        ],
      };
    }

    // ------------------------------
    const totalCount = await ImmersionCountry.countDocuments(filter);

    const items = await ImmersionCountry.find(filter)
      .populate([
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const formatted = await Promise.all(
      items.map(async (row) => ({
        _id: row._id,
        immersionZone: row.immersionZone,
        name: row.name,
        image: row.image && (await getSignedUrlImage(row.image)),
        flag: row.flag && (await getSignedUrlImage(row.flag)),
        universityTitle: row.universityTitle,
        companyTitle: row.companyTitle,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
      }))
    );

    return sendResponse(
      res,
      200,
      {
        count: totalCount,
        data: formatted,
      },
      Messages.DATA_RETRIVED
    );
  } catch (err) {
    console.error(err);
    return sendResponse(res, 400, null, err.message);
  }
};

// --- GET by ID (admin)
exports.getImmersionCountryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return sendResponse(res, 400, null, "Invalid ID");

    const country = await ImmersionCountry.findById(id).lean();
    if (!country) return sendResponse(res, 404, null, "Not found");

    const keyObjectives = await Promise.all(
      (country.keyObjectives || []).map(async (obj) => ({
        icon: obj.icon && (await getSignedUrlImage(obj.icon)),
        description: obj.description,
      }))
    );

    const culturalExploration = await Promise.all(
      (country.culturalExploration || []).map(
        (img) => img && getSignedUrlImage(img)
      )
    );

    return sendResponse(
      res,
      200,
      {
        ...country,
        flag: country.flag && (await getSignedUrlImage(country.flag)),
        image: country.image && (await getSignedUrlImage(country.image)),
        universityImage:
          country.universityImage &&
          (await getSignedUrlImage(country.universityImage)),
        companyImage:
          country.companyImage &&
          (await getSignedUrlImage(country.companyImage)),
        keyObjectives,
        culturalExploration,
      },
      "Data retrieved"
    );
  } catch (err) {
    console.error("Get By ID Error:", err);
    return sendResponse(res, 500, null, err.message);
  }
};

// --- UPDATE immersion countries (admin)
exports.updateImmersionCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.isValidObjectId(id))
      return sendResponse(res, 400, null, "Invalid ID");

    const country = await ImmersionCountry.findById(id);
    if (!country) return sendResponse(res, 404, null, "Not found");

    const isBase64 = (val) => /^data:image\/[a-z]+;base64,/.test(val);

    const image = isBase64(data.image)
      ? (await deleteImageFromS3(country.image),
        await s3Upload(data.image, "immersion/image"))
      : data.image || country.image;

    const flag = isBase64(data.flag)
      ? (await deleteImageFromS3(country.flag),
        await s3Upload(data.flag, "immersion/flag"))
      : data.flag || country.flag;

    const universityImage = isBase64(data.universityImage)
      ? (await deleteImageFromS3(country.universityImage),
        await s3Upload(data.universityImage, "immersion/university"))
      : data.universityImage || country.universityImage;

    const companyImage = isBase64(data.companyImage)
      ? (await deleteImageFromS3(country.companyImage),
        await s3Upload(data.companyImage, "immersion/company"))
      : data.companyImage || country.companyImage;

    const keyObjectives = await Promise.all(
      (data.keyObjectives || []).map(async (obj, i) => ({
        icon: isBase64(obj.icon)
          ? await s3Upload(obj.icon, "immersion/keyObjectives")
          : obj.icon || country.keyObjectives?.[i]?.icon || null,
        description: obj.description,
      }))
    );

    const culturalExploration = await Promise.all(
      (data.culturalExploration || []).map(async (img, i) => {
        if (isBase64(img)) {
          return await s3Upload(img, "immersion/culturalExploration");
        } else if (img && !isBase64(img)) {
          return img;
        } else {
          return country.culturalExploration?.[i] || null;
        }
      })
    );

    const updatePayload = {
      immersionZone: data.immersionZone || country.immersionZone,
      name: data.name || country.name,
      description: data.description || country.description,
      keyObjectives,
      programOverview: data.programOverview || country.programOverview,
      universityTitle: data.universityTitle || country.universityTitle,
      universityShortDes: data.universityShortDes || country.universityShortDes,
      universityFeatures: data.universityFeatures || country.universityFeatures,
      universityImage,
      companyTitle: data.companyTitle || country.companyTitle,
      companyShortDes: data.companyShortDes || country.companyShortDes,
      companyFeatures: data.companyFeatures || country.companyFeatures,
      companyImage,
      image,
      flag,
      culturalExploration,
      updatedBy: req.meta?._id,
    };

    await ImmersionCountry.findByIdAndUpdate(id, updatePayload, { new: true });
    return sendResponse(res, 200, null, "Updated successfully");
  } catch (err) {
    console.error("Update Error:", err);
    return sendResponse(res, 500, null, err.message);
  }
};

// --- DELETE immersion countries (admin)
exports.deleteImmersionCountry = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return sendResponse(res, 400, null, "Invalid ID");

    const country = await ImmersionCountry.findById(id);
    if (!country) return sendResponse(res, 404, null, "Not found");

    // cleanup all S3 images
    const allImages = [
      country.image,
      country.flag,
      country.universityImage,
      country.companyImage,
      ...country.keyObjectives.map((obj) => obj.icon),
      ...country.culturalExploration,
    ].filter(Boolean);

    await Promise.all(allImages.map((src) => deleteImageFromS3(src)));
    await country.deleteOne();

    return sendResponse(res, 200, null, "Deleted successfully");
  } catch (err) {
    console.error("Delete Error:", err);
    return sendResponse(res, 500, null, err.message);
  }
};

// --- WEB country listing by immersion zone (public)
exports.webListImmersionCountries = async (req, res) => {
  try {
    const { immersionZone } = req.query;
    if (!immersionZone) return sendResponse(res, 400, null, "Zone is required");

    const countries = await ImmersionCountry.find({ immersionZone }).lean();
    if (countries.length === 0)
      return sendResponse(res, 404, null, "No data found");

    const formatted = await Promise.all(
      countries.map(async (country) => ({
        _id: country._id,
        name: country.name,
        flag: country.flag ? await getSignedUrlImage(country.flag) : null,
      }))
    );

    return sendResponse(
      res,
      200,
      { immersionZone, countries: formatted },
      Messages.DATA_RETRIVED
    );
  } catch (err) {
    console.error("Error listing by zone:", err);
    return sendResponse(res, 500, null, err.message);
  }
};

//  --- WEB listing by immersion zone by country (public)
exports.webGetImmersionCountryByZoneAndName = async (req, res) => {
  try {
    const { immersionZone, name } = req.query;
    if (!immersionZone || !name)
      return sendResponse(
        res,
        400,
        null,
        "Immersion zone and name are required"
      );

    const country = await ImmersionCountry.findOne({
      immersionZone,
      name,
    }).lean();
    if (!country) return sendResponse(res, 404, null, "Country not found");

    const keyObjectives = await Promise.all(
      (country.keyObjectives || []).map(async (obj) => ({
        icon: obj.icon && (await getSignedUrlImage(obj.icon)),
        description: obj.description,
      }))
    );

    const culturalExploration = await Promise.all(
      (country.culturalExploration || []).map(
        async (img) => img && (await getSignedUrlImage(img))
      )
    );

    const response = {
      _id: country._id,
      immersionZone: country.immersionZone,
      name: country.name,
      description: country.description,
      flag: country.flag && (await getSignedUrlImage(country.flag)),
      image: country.image && (await getSignedUrlImage(country.image)),
      universityImage:
        country.universityImage &&
        (await getSignedUrlImage(country.universityImage)),
      companyImage:
        country.companyImage && (await getSignedUrlImage(country.companyImage)),
      keyObjectives,
      programOverview: country.programOverview,
      universityTitle: country.universityTitle,
      universityShortDes: country.universityShortDes,
      universityFeatures: country.universityFeatures,
      companyTitle: country.companyTitle,
      companyShortDes: country.companyShortDes,
      companyFeatures: country.companyFeatures,
      culturalExploration,
      createdAt: country.createdAt,
    };

    return sendResponse(res, 200, response, Messages.DATA_RETRIVED);
  } catch (err) {
    console.error("Error getting detail by zone and name:", err);
    return sendResponse(res, 500, null, err.message);
  }
};
