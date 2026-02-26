const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    slugUrl: {
      type: String,
      required: false,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: [true, "Creator is required"],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      defaultValue: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;
