const mongoose = require('mongoose');

const likeAndCommentsSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  likeStatus: {
    type: Boolean,
    default: false,
  },
  comments: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'Student',
        required: true,
    },
}, {
  timestamps: true,
});

const LikeAndComments = mongoose.model('LikeAndComments', likeAndCommentsSchema);

module.exports = LikeAndComments;