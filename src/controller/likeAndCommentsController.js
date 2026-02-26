const Community = require("../model/community");
const LikeAndComments = require("../model/likeAndComments");
const { sendResponse } = require("../helper/response");
const Messages = require("../helper/message");
const { getFutureDateTime } = require("../helper/lib");

const createLikeAndComments = async (req, res) => {
  try {
    const { communityId, likeStatus, comments } = req.body;

    // Validation
    if (!communityId) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("Community ID"));
    }

    // Check if the community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return sendResponse(res, 400, null, Messages.COMMUNITY_NOT_FOUND);
    }

    // Handle comments separately (independent of like)
    if (comments) {
      const newComment = await LikeAndComments.create({
        communityId,
        userId: req?.meta?._id,
        comments,
        createdBy: req?.meta?._id,
      });

      return sendResponse(res, 200, newComment, Messages.LIKE_COMMENT_CREATED);
    }

    // Handle like/unlike logic
    if (likeStatus !== undefined && likeStatus !== null) {
      const existingLike = await LikeAndComments.findOne({
        communityId,
        userId: req?.meta?._id,
        comments: { $exists: false }, // Ensure it's a like entry, not a comment
      });

      // If user sends false => remove like if it exists
      if (likeStatus === false) {
        if (existingLike) {
          await LikeAndComments.deleteOne({ _id: existingLike._id });
        }
        return sendResponse(res, 200, null, "Like removed successfully.");
      }

      // likeStatus === true => create or update
      if (existingLike) {
        existingLike.likeStatus = true;
        existingLike.updatedAt = getFutureDateTime();
        await existingLike.save();

        return sendResponse(res, 200, existingLike, Messages.LIKE_COMMENT_UPDATED);
      }

      // Create new like
      const newLike = await LikeAndComments.create({
        communityId,
        userId: req?.meta?._id,
        likeStatus: true,
        createdBy: req?.meta?._id,
      });

      return sendResponse(res, 200, newLike, Messages.LIKE_COMMENT_CREATED);
    }

    return sendResponse(res, 400, null, Messages.INVALID_REQUEST);

  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

module.exports = {
  createLikeAndComments,
};
