const Event = require("../model/event");
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

// SECTION: - Create Event
exports.createEvent = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { title, date, description, image } = req.body;

    if (!title || !date || !description || !image) {
      const missingField = !title
        ? "Title"
        : !date
        ? "Date"
        : !description
        ? "Description"
        : "Image";
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
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    if (!image || !image.startsWith("data:image/")) {
      return sendResponse(res, 400, null, Messages.INVALID_BASE64_IMAGE);
    }
    const uploadedImageUrl = await s3Upload(image, "image");

    await Event.create({
      title,
      date,
      description,
      image: uploadedImageUrl,
      createdBy: staffId,
      createdAt: getCurrentISTTime(),
      updatedAt: getCurrentISTTime(),
    });

    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error);
  }
};

// SECTION: - Update Event
exports.updateEvent = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;
    const { title, date, description, image } = req.body;

    if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const event = await Event.findById(id);
    if (!event) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    let uploadedImageUrl = event.image;

    // Only update if image is in base64 format

    const isBase64Image =
      typeof image === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(image);

    if (image && isBase64Image) {
      if (event.image) {
        await deleteImageFromS3(event.image);
      }
      uploadedImageUrl = await s3Upload(image, "image");
    }

    await Event.findByIdAndUpdate(
      id,
      {
        title,
        date,
        description,
        image: uploadedImageUrl,
        updatedBy: staffId,
        updatedAt: getCurrentISTTime(),
      },
      { new: true }
    );

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    sendResponse(res, 400, null, error);
  }
};

// SECTION: - Get Event By Id
exports.getEventById = async (req, res) => {
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

    const event = await Event.findById(id)
      .select("-__v -updatedBy -createdAt -updatedAt -createdBy ")
      .lean();

    if (!event) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    if (event.image) {
      event.image = await getSignedUrlImage(event.image);
    }

    sendResponse(res, 200, event, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All Events
exports.getAllEvents = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }
    const count = await Event.countDocuments();
    const events = await Event.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const formattedEvents = await Promise.all(
      events.map(async (item) => ({
        _id: item._id,
        title: item.title,
        date: item.date,
        description: item.description,
        image: item.image ? await getSignedUrlImage(item.image) : null,
        status: item.status,
        createdBy: item?.createdBy?.name ?? null,
        updatedBy: item?.updatedBy?.name ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
    );

    sendResponse(
      res,
      200,
      { count, events: formattedEvents },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Delete event
exports.deleteEventById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const [staff, event] = await Promise.all([
      Staff.findById(staffId),
      Event.findById(id),
    ]);

    if (!staff || !event) {
      const message = !staff
        ? Messages.STAFF_NOT_FOUND
        : Messages.DATA_NOT_FOUND;
      return sendResponse(res, 400, null, message);
    }

    if (event.bannerImage) {
      await deleteImageFromS3(event.bannerImage);
    }

    await Event.findByIdAndDelete(id);

    sendResponse(res, 200, null, Messages.DELETED_DATA("Event"));
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All Events for Web (Public Access, No Pagination)
exports.getAllEventsForWeb = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();

    const formattedEvents = await Promise.all(
      events.map(async (item) => ({
        _id: item?._id,
        title: item.title,
        date: item.date,
        description: item.description,
        // image: item.image ? await getSignedUrlImage(item.image) : null,
        image: item.image ? item.image : null,
        status: item.status,
        createdAt: item.createdAt,
      }))
    );

    sendResponse(res, 200, formattedEvents, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
