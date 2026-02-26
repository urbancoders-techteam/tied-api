const mongoose = require("mongoose");
const { getSignedUrlImage, s3Upload } = require("../helper/uploadToS3");
const Blog = require("../model/blog");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");

// SECTION - Create a new blog
exports.createBlog = async (req, res) => {
  try {
    const { title, description, slugUrl, image, date } = req.body;

    // Validate required fields
    if (!title || !description || !slugUrl || !date || !image) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELDS);
    }

    // Check for valid date
    if (isNaN(new Date(date).getTime())) {
      return sendResponse(res, 400, null, Messages.INVALID_DATE);
    }

    // ✅ Check for duplicate slugUrl
    const existingBlog = await Blog.findOne({ slugUrl });
    if (existingBlog) {
      return sendResponse(
        res,
        400,
        null,
        "A blog with this slug URL already exists."
      );
    }

    // Validate base64 image
    if (!image?.includes("base64")) {
      return sendResponse(res, 400, null, "Image file format not supported");
    }

    // Upload image
    const uploadedImageKey = await s3Upload(image, "image");

    // Create payload
    const payload = {
      title,
      description,
      slugUrl,
      image: uploadedImageKey,
      date: new Date(date).toISOString(),
      createdBy: req?.meta?._id,
    };

    // Save blog
    await Blog.create(payload);

    // Return response
    return sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    console.error("Error creating blog:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

// SECTION - update existing blog
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params; // Blog ID from route parameters
    const { title, description, slugUrl, image, date } = req.body;

    if (!id) {
      return sendResponse(res, 400, null, Messages.ID_PARAMETER_REQUIRED);
    }

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }
    if (isNaN(new Date(date).getTime())) {
      return sendResponse(res, 400, null, Messages.INVALID_DATE);
    }
    // Check if the blog exists
    const blog = await Blog.findById(id);
    if (!blog) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    // // Validate slugUrl if it's being updated
    // if (slugUrl) {
    //   const slugUrlRegex = /^[a-zA-Z0-9-_]+$/;
    //   if (!slugUrlRegex.test(slugUrl)) {
    //     return sendResponse(res, 400, null, Messages.INVALID_SLUG_URL);
    //   }

    //   // Check if the slugUrl is already taken by another blog
    //   const alreadyExists = await Blog.findOne({
    //     slugUrl: { $regex: `^${slugUrl}$`, $options: "i" },
    //     _id: { $ne: id }, // Exclude the current blog from the check
    //   });
    //   if (alreadyExists) {
    //     return sendResponse(res, 400, null, Messages.SLUG_ALREADY_EXISTS);
    //   }
    // }

    // Upload a new image if provided
    let uploadedUrl = blog?.image;
    if (image && image?.includes("base64")) {
      uploadedUrl = await s3Upload(image, "image");
    }
    await Blog.findByIdAndUpdate(id, {
      ...(title && { title }),
      ...(description && { description }),
      ...(slugUrl && { slugUrl }),
      ...(image && { uploadedUrl }),
      ...(date && { date: new Date(date).toISOString() }),
      updatedBy: req?.meta?._id,
    });

    // Send success response
    return sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    console.error("Error updating blog:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

// SECTION - get blog by Id
exports.getBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, 400, null, Messages.ID_PARAMETER_REQUIRED);
    }

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    // Check if the blog exists
    const blog = await Blog.findById(id);
    if (!blog) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    const resData = {
      _id: blog._id,
      title: blog.title,
      description: blog.description,
      slugUrl: blog.slugUrl,
      image: blog.image ? await getSignedUrlImage(blog.image) : null,
      date: blog?.date,
    };

    // Send success response
    return sendResponse(res, 200, resData, Messages.DATA_FETCHED);
  } catch (error) {
    console.error("Error updating blog:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};
// SECTION - get blog by Id
exports.getBlogBySlugUrl = async (req, res) => {
  try {
    const { slugurl } = req.params;

    if (!slugurl) {
      return sendResponse(res, 400, null, Messages.ID_PARAMETER_REQUIRED);
    }

    // Check if the blog exists
    const blog = await Blog.findOne({
      slugUrl: { $regex: `^${slugurl}$`, $options: "i" },
    });
    if (!blog) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }
    const resData = {
      title: blog.title,
      description: blog.description,
      slugUrl: blog.slugUrl,
      image: blog.image ? await getSignedUrlImage(blog.image) : null,
      date: blog?.date,
    };

    // Send success response
    return sendResponse(res, 200, resData, Messages.DATA_FETCHED);
  } catch (error) {
    console.error("Error updating blog:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

// SECTION - get all blogs
exports.getAllBlogs = async (req, res) => {
  try {
    let { page = 1, limit = 10, search } = req.query;

    page = Math.max(parseInt(page, 10) || 1, 1);
    limit = Math.max(parseInt(limit, 10) || 10, 1);

    // --- SEARCH LOGIC ---
    const query = search
      ? {
          title: { $regex: search, $options: "i" },
        }
      : {};

    // Count documents after search filtering
    const count = await Blog.countDocuments(query);

    const blogs = await Blog.find(query)
      .populate({
        path: "createdBy",
        select: "name",
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const data = await Promise.all(
      blogs.map(async (blog) => ({
        _id: blog._id,
        title: blog.title,
        description: blog.description,
        slugUrl: blog.slugUrl,
        image: blog.image ? await getSignedUrlImage(blog.image) : null,
        date: blog.date,
        createdAt: blog.createdAt,
        createdBy: blog.createdBy?.name,
      }))
    );

    return sendResponse(
      res,
      200,
      {
        blogs: data,
        count,
        totalPage: Math.ceil(count / limit),
        currentPage: page,
      },
      Messages.DATA_FETCHED
    );
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

// SECTION - get all blogs for web
exports.getAllBlogsForWeb = async (req, res) => {
  try {
    // Check if the blog exists
    const blogs = await Blog.find().sort({ createdAt: -1 });

    const data = await Promise.all(
      blogs.map(async (blog) => ({
        title: blog.title,
        description: blog.description,
        slugUrl: blog.slugUrl,
        image: blog.image ? await getSignedUrlImage(blog.image) : null,
        date: blog?.date,
      }))
    );
    // Send success response
    return sendResponse(res, 200, data, Messages.DATA_FETCHED);
  } catch (error) {
    console.error("Error updating blog:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendResponse(res, 400, null, Messages.ID_PARAMETER_REQUIRED);
    }

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }
    // Check if the blog exists
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }
    return sendResponse(res, 201, null, Messages.DATA_DELETED);
  } catch (error) {
    console.error("Error deleting blog:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};
