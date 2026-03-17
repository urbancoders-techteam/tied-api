const mongoose = require("mongoose");

const getInTouchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
    },
    mobile: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
    },
    remark: {
      type: String,
      required: false,
    },
    from_name: {
      type: String,
      required: false,
      default: "TIE",
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "Student",
      required: false,
    },
  },
  { timestamps: true }
);

const GetInTouch = mongoose.model("GetInTouch", getInTouchSchema);

module.exports = GetInTouch;
