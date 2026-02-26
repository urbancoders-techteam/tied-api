const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const { s3Upload, getSignedUrlImage } = require("../helper/uploadToS3");
const WebBanner = require("../model/webBanner");

// SECTION - Create a new webBanner
const createWebBanner = async (req, res) => {
  try {
    const { content, bannerImg } = req.body;

    if (!content || !bannerImg) {
      const missingField = !content ? "content" : "bannerImg";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    const url = await s3Upload(bannerImg, "image");

    // Save webBanner entry
    await WebBanner.create({
      content,
      bannerImg: url,
      createdBy: req?.meta?._id,
    });

    return sendResponse(res, 200, Messages.DATA_CREATED);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

// SECTION - Get all webBanners
const getAllWebBanners = async (req, res) => {
  try {
    const { page, limit } = req.query;

    // Handle optional pagination
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const parsedLimit = limit ? parseInt(limit) : null;

    const count = await WebBanner.countDocuments({});

    const query = WebBanner.find({});
    if (parsedLimit) {
      query.skip(skip).limit(parsedLimit); // Apply pagination only if limit is provided
    }

    const webBannersList = await query
      .populate([{ path: "createdBy", select: "name" }]) // Populate only if authenticated
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const formattedData = await Promise.all(
      webBannersList.map(async (item) => {
        return {
          _id: item._id,
          content: item?.content ?? null,
          bannerImg: item?.bannerImg
            ? await getSignedUrlImage(item?.bannerImg)
            : null,
          createdAt: item?.createdAt ?? null,
          createdBy: item?.createdBy?.name ?? null, // Include createdBy only if authenticated
        };
      })
    );

    sendResponse(res, 200, { formattedData, count }, Messages.DATA_RETRIVED);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

// SECTION - Get a web banner by ID
const getWebBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const webBanner = await WebBanner.findById(id);
    if (!webBanner)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    // Convert the banner image URL to a signed URL

    const webBannerImg = await getSignedUrlImage(webBanner.bannerImg);
    const formattedData = {
      _id: webBanner?._id,
      content: webBanner?.content ?? null,
      bannerImg: webBannerImg ?? null,
    };
    sendResponse(res, 200, formattedData, Messages.DATA_FETCHED);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

// SECTION - Update a web banner by ID
const updateWebBanner = async (req, res) => {
  try {
    const { content, bannerImg } = req.body;
    const { id } = req.params;
    const banner = await WebBanner.findById(id);
    if (!banner) {
      sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    if (!content || !bannerImg) {
      const missingField = !content ? "content" : "bannerImg";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    const update = await WebBanner.findOne({
      _id: { $ne: id },
    });

    const base64Regex = /^data:image\/[a-z]+;base64,/;
    if (base64Regex.test(bannerImg)) {
      const url = await s3Upload(bannerImg, "image");
      await WebBanner.findByIdAndUpdate(
        id,
        {
          $set: {
            content,
            bannerImg: url,
            updatedBy: req?.meta?._id,
          },
        },
        { new: true }
      );
    } else {
      await WebBanner.findByIdAndUpdate(
        id,
        {
          $set: {
            content,
            updatedBy: req?.meta?._id,
          },
        },
        { new: true }
      );
    }

    if (!update) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    sendResponse(res, 200, update, Messages.DATA_UPDATE);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

//SECTION - Delete a web banner by ID
const deleteWebBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const webBanner = await WebBanner.findByIdAndDelete(id);
    if (!webBanner)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

module.exports = {
  createWebBanner,
  getAllWebBanners,
  getWebBannerById,
  updateWebBanner,
  deleteWebBanner,
};
