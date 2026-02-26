const RegulatoryBodies = require("../model/regulatoryBodies");
const Staff = require("../model/staffModel");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const mongoose = require("mongoose");
const { getCurrentISTTime } = require("../helper/lib");
const {
  getSignedUrlImage,
  s3Upload,
  deleteImageFromS3,
} = require("../helper/uploadToS3");

// CREATE
exports.createRegulatoryBody = async (req, res) => {
  try {
    const staffId = req?.meta?._id;

    const { title, link, image } = req.body;

    if (!title || !link || !image) {
      const missingField = !title ? "Title" : !link ? "Link" : "Image";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);

    if (!image.startsWith("data:image/")) {
      return sendResponse(res, 400, null, Messages.INVALID_BASE64_IMAGE);
    }

    const uploadedImageUrl = await s3Upload(image, "image");

    await RegulatoryBodies.create({
      title,
      link,
      image: uploadedImageUrl,
      createdBy: staffId,
      createdAt: getCurrentISTTime(),
      updatedAt: getCurrentISTTime(),
    });

    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

// UPDATE
exports.updateRegulatoryBody = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;
    const { title, link, image } = req.body;

    if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const [staff, record] = await Promise.all([
      Staff.findById(staffId),
      RegulatoryBodies.findById(id),
    ]);

    if (!staff || !record) {
      const message = !staff
        ? Messages.STAFF_NOT_FOUND
        : Messages.DATA_NOT_FOUND;
      return sendResponse(res, 400, null, message);
    }

    let updatedImageUrl = record.image;

    const isBase64Image =
      typeof image === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(image);

    if (image && isBase64Image) {
      if (record.image) await deleteImageFromS3(record.image);
      updatedImageUrl = await s3Upload(image, "image");
    }

    await RegulatoryBodies.findByIdAndUpdate(
      id,
      {
        title,
        link,
        image: updatedImageUrl,
        updatedBy: staffId,
        updatedAt: getCurrentISTTime(),
      },
      { new: true }
    );

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

// GET BY ID
exports.getRegulatoryBodyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const record = await RegulatoryBodies.findById(id).lean();

    if (!record) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    if (record.image) {
      record.image = await getSignedUrlImage(record.image);
    }

    sendResponse(res, 200, record, Messages.DATA_FETCHED);
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

// GET ALL
exports.getAllRegulatoryBodies = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await RegulatoryBodies.countDocuments();

    const records = await RegulatoryBodies.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const formatted = await Promise.all(
      records.map(async (item) => ({
        ...item,
        image: item.image ? await getSignedUrlImage(item.image) : null,
        createdBy: item?.createdBy?.name ?? null,
        updatedBy: item?.updatedBy?.name ?? null,
      }))
    );

    sendResponse(
      res,
      200,
      { count: total, data: formatted },
      Messages.DATA_RETRIVED
    );
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

// DELETE
exports.deleteRegulatoryBody = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const record = await RegulatoryBodies.findById(id);

    if (!record) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    if (record.image) await deleteImageFromS3(record.image);

    await RegulatoryBodies.findByIdAndDelete(id);

    sendResponse(res, 200, null, Messages.DELETED_DATA("Regulatory Body"));
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};

// GET ALL REGULATORY BODIES - Public (No Token)
exports.getAllRegulatoryBodiesForWeb = async (req, res) => {
  try {
    const records = await RegulatoryBodies.find()
      .sort({ createdAt: -1 })
      .lean();

    const formatted = await Promise.all(
      records.map(async (item) => ({
        _id: item._id,
        title: item.title,
        link: item.link,
        image: item.image ? await getSignedUrlImage(item.image) : null,
        createdAt: item.createdAt,
      }))
    );

    sendResponse(res, 200, formatted, Messages.DATA_RETRIVED);
  } catch (err) {
    sendResponse(res, 400, null, err.message);
  }
};
