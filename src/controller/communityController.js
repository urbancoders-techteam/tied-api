const Community = require("../model/community");
const Staff = require("../model/staffModel");
const Student = require("../model/studentModel");

const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const {
  s3Upload,
  getSignedUrlImage,
  deleteImageFromS3,
} = require("../helper/uploadToS3");
const { isBase64 } = require("../helper/lib");
const LikeAndComments = require("../model/likeAndComments");

// SECTION - Create a new community
const createCommunity = async (req, res) => {
  try {
    const { title, message, filledBy, communityPosts } = req.body;

    // Validation for required fields
    if (!title || !message || !filledBy) {
      const missingField = !title ? "Title" : !message ? "Message" : "Type";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    // Validate filledBy value
    if (filledBy !== "admin" && filledBy !== "user") {
      return sendResponse(
        res,
        400,
        null,
        `Invailid ${filledBy} is not allowed`
      );
    }

    let communityKeys = communityPosts;

    // Upload each file if provided and add the `filledBy` field
    if (Array.isArray(communityPosts) && communityPosts.length) {
      const addCommunity = await Promise.all(
        communityPosts.map(async (doc) => {
          const newKey = await s3Upload(doc.url, "image");
          return { url: newKey, filledBy };
        })
      );

      communityKeys = addCommunity.filter(Boolean);
    }

    const approvedBy = filledBy === "admin" ? "approved" : "pending";

    // Save community entry
    await Community.create({
      title,
      message,
      filledBy,
      approvedStatus: approvedBy,
      communityPosts: communityKeys,
      createdBy: req.meta,
      createdByRefModel: req.metaModel,
    });
    return sendResponse(res, 200, Messages.COMMUNTIY_CREATED);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

//SECTION - Get all communities with search by title
const getAllCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const userId = req?.meta?._id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // --- SEARCH LOGIC ---
    const query = search
      ? {
          title: { $regex: search, $options: "i" },
        }
      : {};

    const count = await Community.countDocuments(query);

    const communityListQuery = [
      { $match: query },
      {
        $lookup: {
          from: "likeandcomments",
          localField: "_id",
          foreignField: "communityId",
          as: "likeAndComments",
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "createdBy",
          foreignField: "_id",
          as: "studentDetails",
        },
      },
      {
        $lookup: {
          from: "staffs",
          localField: "createdBy",
          foreignField: "_id",
          as: "staffDetails",
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: {
              $filter: {
                input: "$likeAndComments",
                as: "like",
                cond: { $eq: ["$$like.likeStatus", true] },
              },
            },
          },
          commentsCount: {
            $size: {
              $filter: {
                input: "$likeAndComments",
                as: "comment",
                cond: {
                  $and: [
                    { $ne: ["$$comment.comments", null] },
                    { $ne: ["$$comment.comments", ""] },
                    {
                      $gt: [
                        { $strLenCP: { $ifNull: ["$$comment.comments", ""] } },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
          isLiked: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$likeAndComments",
                    as: "item",
                    cond: {
                      $and: [
                        { $eq: ["$$item.userId", { $toObjectId: userId }] },
                        { $eq: ["$$item.likeStatus", true] },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    let communityList = await Community.aggregate(communityListQuery);

    // ---------- SIGNED URL HANDLING ----------
    const communityListWithSignedUrls = await Promise.all(
      communityList.map(async (community) => {
        if (community.imageKey) {
          community.imageUrl = await getSignedUrlImage(community.imageKey);
        }

        if (community.communityPosts) {
          community.communityPosts = await Promise.all(
            community.communityPosts.map(async (post) => {
              if (post.url) post.url = await getSignedUrlImage(post.url);
              return post;
            })
          );
        }

        if (community.studentDetails.length > 0) {
          community.createdBy = {
            id: community.createdBy,
            name: community.studentDetails[0].username,
          };
        } else if (community.staffDetails.length > 0) {
          community.createdBy = {
            id: community.createdBy,
            name: community.staffDetails[0].name,
          };
        }

        delete community.studentDetails;
        delete community.staffDetails;

        return community;
      })
    );

    sendResponse(
      res,
      200,
      {
        count,
        communityList: communityListWithSignedUrls,
        totalPage: Math.ceil(count / limit),
        currentPage: parseInt(page),
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    console.log(error);
    sendResponse(res, 400, null, error.message);
  }
};


//SECTION - Get a single community by ID
const getCommunityById = async (req, res) => {
  const { id } = req.params;
  try {
    const community = await Community.findById(id);
    if (!community) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    // Generate signed URLs for documents
    const communityPostWithSignedUrls = await Promise.all(
      (community?.communityPosts ?? []).map(async (ele) => ({
        url: ele?.url ? await getSignedUrlImage(ele.url) : null,
      }))
    );

    const formattedData = {
      _id: community?._id,
      title: community?.title ?? null,
      message: community?.message ?? null,
      documents: communityPostWithSignedUrls,
    };
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Update a community by ID
const updateCommunity = async (req, res) => {
  const { id } = req.params;
  const { title, message, filledBy, communityPosts } = req.body;

  try {
    // Validate required fields
    if (!filledBy || (filledBy !== "admin" && filledBy !== "user")) {
      return sendResponse(res, 400, null, `Invalid ${filledBy} is not allowed`);
    }

    const community = await Community.findById(id);
    if (!community) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    // Fetch existing communityPosts from the database
    const existingPosts = community.communityPosts || [];

    // Handle document update
    let updatedCommunityPosts = [];
    if (Array.isArray(communityPosts) && communityPosts.length) {
      updatedCommunityPosts = await Promise.all(
        communityPosts.map(async (doc, index) => {
          const isSignedUrl =
            typeof doc.url === "string" && doc.url.includes("X-Amz-");

          if (doc.url && isBase64(doc.url)) {
            // Delete old doc if exists
            const oldDoc = existingPosts[index];
            if (oldDoc?.url) {
              await deleteImageFromS3(oldDoc.url);
            }

            const newKey = await s3Upload(doc.url, "image");
            return { url: newKey, filledBy };
          } else if (!isBase64(doc.url) && !isSignedUrl) {
            // Raw S3 key
            return { url: doc.url, filledBy };
          } else {
            // Signed URL – retain original
            const oldDoc = existingPosts[index];
            return oldDoc ? { ...oldDoc, filledBy } : null;
          }
        })
      );

      updatedCommunityPosts = updatedCommunityPosts.filter(Boolean);
    }

    // Final update
    const update = await Community.findByIdAndUpdate(
      id,
      {
        $set: {
          title,
          message,
          filledBy, // root-level filledBy
          communityPosts: updatedCommunityPosts,
          updatedBy: req?.meta?._id,
        },
      },
      { new: true }
    );

    sendResponse(res, 200, update, Messages.COMMUNTIY_UPDATE);
  } catch (error) {
    console.log("error :>> ", error);
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION -  Delete a community by ID
const deleteCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const community = await Community.findByIdAndDelete(id);
    if (!community)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    sendResponse(res, 200, null, Messages.COMMUNTIY_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - To update community status
const updateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await Community.findByIdAndUpdate(
      id,
      {
        $set: {
          approvedStatus: status,
          updatedBy: req?.meta?._id,
        },
      },
      { new: true }
    );
    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Add or update like and comment
const addOrUpdateLikeAndComment = async (req, res) => {
  try {
    const { communityId, userId, likeStatus, comment } = req.body;

    // Validate required fields
    if (!communityId || !userId) {
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD("communityId or userId")
      );
    }

    // Find the existing like/comment entry for the user and community
    const existingEntry = await LikeAndComments.findOne({
      communityId,
      userId,
    });

    if (existingEntry) {
      // Update the existing entry
      const updatedEntry = await LikeAndComments.findByIdAndUpdate(
        existingEntry._id,
        {
          $set: {
            ...(likeStatus !== undefined && { likeStatus }), // Update likeStatus only if provided
            ...(comment && { comments: comment }), // Update comment only if provided
          },
        },
        { new: true }
      );

      return sendResponse(res, 200, updatedEntry, Messages.DATA_UPDATE);
    } else {
      // Create a new entry
      const newEntry = await LikeAndComments.create({
        communityId,
        userId,
        likeStatus: likeStatus || false, // Default to false if not provided
        comments: comment || null, // Default to null if no comment provided
      });

      return sendResponse(res, 201, newEntry, Messages.DATA_CREATED);
    }
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error (unique index violation)
      return sendResponse(
        res,
        400,
        null,
        "Duplicate entry for communityId and userId"
      );
    }
    sendResponse(res, 400, null, error.message);
  }
};

module.exports = {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  updateStatus,
  addOrUpdateLikeAndComment, // Export the new function
};
