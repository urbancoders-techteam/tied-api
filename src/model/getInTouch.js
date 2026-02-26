const mongoose = require("mongoose");

const getInTouchSchema = new mongoose.Schema(
  {
    mobile: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    remark: {
      type: String,
      required: false,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "Student",
    },
  },
  { timestamps: true }
);

const GetInTouch = mongoose.model("GetInTouch", getInTouchSchema);

module.exports = GetInTouch;
