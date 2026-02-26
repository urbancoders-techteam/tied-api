const Banner = require("../model/Banner");
const { Messages } = require("../helper/message");
const Plan = require("../model/plan");
const { sendResponse } = require("../helper/response");
const {
  uploadToS3,
  s3Upload,
  getSignedUrlImage,
  deleteImageFromS3,
} = require("../helper/uploadToS3");
const e = require("express");
const { planByType } = require("./service");

//Section - Create Banner (Admin)
exports.createBanner = async (req, res) => {
  try {
    const {
      courseId,
      date,
      title,
      description,
      image,
      numberOfClass,
      numberOfMockTest,
    } = req.body;
    const duplicate = await Banner.findOne({
      courseId: { $eq: courseId },
    });
    if (duplicate) {
      return sendResponse(res, 400, null, Messages.SAME_COURSE);
    }
    const url = await s3Upload(image, "image");
     await Banner.create({
      courseId,
      date,
      title,
      description,
      image: url,
      numberOfClass,
      numberOfMockTest,
      createdBy: req?.meta?._id,
    });

    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - List Banner (Admin)
exports.listBanner = async (req, res) => {
  try {
    const { page, limit, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const plans = await planByType(type);
    const count = await Banner.countDocuments({ courseId: { $in: plans } });
    const banners = await Banner.find({ courseId: { $in: plans } })
      .populate([
        { path: "courseId", select: "title" },
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .skip(skip)
      .limit(parsedLimit)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Format the data
    const formattedData = await Promise.all(
      banners.map(async (item) => {
        return {
          _id: item?._id,
          courseId: item?.courseId?._id ?? null,
          courseName: item?.courseId?.title ?? null,
          date: item?.date ?? null,
          title: item?.title ?? null,
          description: item?.description ?? null,
          image: item.image ? await getSignedUrlImage(item.image) : null,
          numberOfClass: item?.numberOfClass ?? 0,
          numberOfMockTest: item?.numberOfMockTest ?? 0,
          createdBy: item?.createdBy?.name ?? null,
          updatedBy: item?.updatedBy?.name ?? null,
          createdAt: item?.createdAt,
        };
      })
    );

    sendResponse(
      res,
      200,
      { count, formattedData },
      "Banners retrieved successfully"
    );
  } catch (error) {
    console.error("Error retrieving banners:", error);
    sendResponse(res, 500, error.message, "Error retrieving banners");
  }
};

//Section - Get by id (Admin)
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id).populate([
      { path: "courseId", select: "title" },
    ]);
    if (!banner) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    const formattedData = {
      _id: banner?._id,
      courseId: banner?.courseId ?? null,
      // courseName: banner?.courseId?.title ?? null,
      date: banner?.date ?? null,
      title: banner?.title ?? null,
      description: banner?.description ?? null,
      image: banner?.image ? await getSignedUrlImage(banner.image) : null,
      numberOfClass: banner?.numberOfClass ?? 0,
      numberOfMockTest: banner?.numberOfMockTest ?? 0,
      createdAt: banner?.createdAt,
    };

    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    console.log(error);
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Update Banner (Admin)
exports.updateBanner = async (req, res) => {
  try {
    const {
      courseId,
      date,
      title,
      description,
      image,
      numberOfClass,
      numberOfMockTest,
    } = req.body;
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    const duplicate = await Banner.findOne({
      _id: { $ne: id },
      courseId: { $eq: courseId },
    });
    if (duplicate) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }

    if (!image) {
      return sendResponse(res, 400, null, "Image is required.");
    }

    const base64Regex = /^data:image\/[a-z]+;base64,/;

    if (base64Regex.test(image)) {
      if (banner.image) {
        try {
          await deleteImageFromS3(banner.image);
        } catch (err) {
          console.error("Error deleting image from S3:", err);
          return sendResponse(
            res,
            500,
            null,
            "Failed to delete the previous image."
          );
        }
      }

      // Upload the new image to S3
      let url;
      try {
        url = await s3Upload(image, "image");
      } catch (err) {
        console.error("Error uploading image to S3:", err);
        return sendResponse(res, 400, null, "Failed to upload image.");
      }

      // Update the banner with the new image URL
      await Banner.findByIdAndUpdate(
        id,
        {
          $set: {
            courseId,
            date,
            title,
            description,
            image: url,
            numberOfClass,
            numberOfMockTest,
            updatedBy: req?.meta?._id,
          },
        },
        { new: true }
      );
    } else {
      // Update the banner without changing the image
      await Banner.findByIdAndUpdate(
        id,
        {
          $set: {
            courseId,
            date,
            title,
            description,
            numberOfClass,
            numberOfMockTest,
            updatedBy: req?.meta?._id,
          },
        },
        { new: true }
      );
    }

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    console.error("Error updating banner:", error);
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Delete Banner (Admin)
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Web Get
exports.webListBanner = async (req, res) => {
  try {
    const banners = await Banner.find()
      .populate([
        { path: "courseId", select: "title" },
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Format the data
    const formattedData = await Promise.all(
      banners?.map(async (item) => ({
        _id: item?._id,
        courseId: item?.courseId?._id ?? null,
        courseName: item?.courseId?.title ?? null,
        date: item?.date ?? null,
        title: item?.title ?? null,
        description: item?.description ?? null,
        image: item?.image ? await getSignedUrlImage(item.image) : null,
        // createdBy: item?.createdBy?.name ?? null,
        // updatedBy: item?.updatedBy?.name ?? null,
        // createdAt: item?.createdAt
      }))
    );

    sendResponse(res, 200, formattedData, "Banners retrieved successfully");
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
