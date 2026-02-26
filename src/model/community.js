const mongoose = require("mongoose");

const communityPostsSchema = new mongoose.Schema({
  url: {
    type: String, // Base64 image URL
    required: false,
  },
});

const communitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    filledBy: {
      // For tracking who filled the form
      type: String,
      enum: ["admin", "user"],
    },
    message: {
      type: String,
      required: true,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    approvedStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    communityPosts: [
      {
        type: communityPostsSchema,
        required: false,
        default: [],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByRefModel",
      required: true,
    },
    createdByRefModel: {
      type: String,
      enum: ["Staff", "Student"],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "updateByRefModel",
      required: false,
      default: null,
    },
    updateByRefModel: {
      type: String,
      enum: ["Staff", "Student"],
    },
  },
  {
    timestamps: true,
  }
);

const Community = mongoose.model("Community", communitySchema);

module.exports = Community;
