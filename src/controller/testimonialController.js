const Testimonial = require("../model/testimonial");
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

// SECTION: - Create Testimonial
exports.createTestimonial = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { studentName, university, course, paragraph, rating, studentImage } =
      req.body;

    if (
      !studentName ||
      !university ||
      !course ||
      !paragraph ||
      !rating ||
      !studentImage
    ) {
      const missingField = !studentName
        ? "Student Name"
        : !university
        ? "University"
        : !course
        ? "Course"
        : !paragraph
        ? "Paragraph"
        : !rating
        ? "Rating"
        : "Student Image";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (isNaN(rating) || rating < 1 || rating > 5) {
      let invalidField = isNaN(rating)
        ? "Rating must be a number"
        : rating < 1 || rating > 5
        ? "Rating must be between 1 and 5"
        : "Rating";

      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(invalidField)
      );
    }

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);

    if (!studentImage.startsWith("data:image/")) {
      return sendResponse(res, 400, null, Messages.INVALID_BASE64_IMAGE);
    }

    const uploadedImageUrl = await s3Upload(studentImage, "image");

    await Testimonial.create({
      studentName,
      university,
      course,
      paragraph,
      rating,
      studentImage: uploadedImageUrl,
      createdBy: staffId,
      createdAt: getCurrentISTTime(),
      updatedAt: getCurrentISTTime(),
    });

    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Update Testimonial
exports.updateTestimonial = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;
    const { studentName, university, course, paragraph, rating, studentImage } =
      req.body;

    if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const [staff, testimonial] = await Promise.all([
      Staff.findById(staffId),
      Testimonial.findById(id),
    ]);

    if (!staff) return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    if (!testimonial)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    if (rating) {
      if (isNaN(rating) || rating < 1 || rating > 5) {
        let invalidField = isNaN(rating)
          ? "Rating must be a number"
          : rating < 1 || rating > 5
          ? "Rating must be between 1 and 5"
          : "Rating";

        return sendResponse(
          res,
          400,
          null,
          Messages.REQUIRED_FIELD(invalidField)
        );
      }
    }

    let uploadedImageUrl = testimonial.studentImage;

    const isBase64Image =
      typeof studentImage === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(studentImage);

    if (studentImage && isBase64Image) {
      if (testimonial.studentImage) {
        await deleteImageFromS3(testimonial.studentImage);
      }
      uploadedImageUrl = await s3Upload(studentImage, "image");
    }

    await Testimonial.findByIdAndUpdate(
      id,
      {
        studentName,
        university,
        course,
        paragraph,
        rating,
        studentImage: uploadedImageUrl,
        updatedBy: staffId,
        updatedAt: getCurrentISTTime(),
      },
      { new: true }
    );

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get Testimonial By Id
exports.getTestimonialById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);

    const testimonial = await Testimonial.findById(id)
      .select("-__v -updatedBy -createdBy -createdAt -updatedAt")
      .lean();

    if (!testimonial) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    if (testimonial.studentImage) {
      testimonial.studentImage = await getSignedUrlImage(testimonial.studentImage);
    }

    sendResponse(res, 200, testimonial, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All Testimonials
exports.getAllTestimonials = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const staff = await Staff.findById(staffId);
    if (!staff) return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);

    const count = await Testimonial.countDocuments();
    const testimonials = await Testimonial.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const formattedTestimonials = await Promise.all(
      testimonials.map(async (item) => ({
        _id: item._id,
        studentName: item.studentName,
        university: item.university,
        course: item.course,
        paragraph: item.paragraph,
        rating: item.rating,
        studentImage: item.studentImage
          ? await getSignedUrlImage(item.studentImage)
          : null,
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
      { count, data: formattedTestimonials },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Delete Testimonial
exports.deleteTestimonialById = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const [staff, testimonial] = await Promise.all([
      Staff.findById(staffId),
      Testimonial.findById(id),
    ]);

    if (!staff || !testimonial) {
      const message = !staff
        ? Messages.STAFF_NOT_FOUND
        : Messages.DATA_NOT_FOUND;
      return sendResponse(res, 400, null, message);
    }

    if (testimonial.studentImage) {
      await deleteImageFromS3(testimonial.studentImage);
    }

    await Testimonial.findByIdAndDelete(id);

    sendResponse(res, 200, null, Messages.DELETED_DATA("Testimonial"));
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get All Testimonials for Web (Public)
exports.getAllTestimonialsForWeb = async (req, res) => {
  try {
    const testimonials = await Testimonial.find()
      .sort({ createdAt: -1 })
      .lean();

    const formattedTestimonials = await Promise.all(
      testimonials.map(async (item) => ({
        _id: item._id,
        studentName: item.studentName,
        university: item.university,
        course: item.course,
        paragraph: item.paragraph,
        rating: item.rating,
        studentImage: item.studentImage
          ? await getSignedUrlImage(item.studentImage)
          : null,
        status: item.status,
        createdAt: item.createdAt,
      }))
    );

    sendResponse(res, 200, formattedTestimonials, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
