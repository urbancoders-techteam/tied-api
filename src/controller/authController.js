const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Student = require("../model/studentModel");
const Staff = require("../model/staffModel");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");

// SECTION: Reset password STAFF

exports.forgetPassword = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { type, id, password } = req.body;

    const staffExist = await Staff.findById(userId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }
    
    if (!type || !id || !password) {
        return sendResponse(res, 400, null, Messages.REQUIRED_FIELDS);
    }
    if (!id || !mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }
    
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    let Model = null;
    if (type === "student") {
      Model = Student;
    } else if (type === "staff") {
      Model = Staff;
    } else {
      return sendResponse(res, 400, null, Messages.INVALID_TYPE);
    }

    const user = await Model.findById(id);
    if (!user) {
      return sendResponse(res, 400, null, Messages.USER_NOT_FOUND);
    }

    await Model.findByIdAndUpdate(id, {
      password: hashedPassword,
      updatedAt: new Date(),
    });

    return sendResponse(res, 200, null, Messages.PASSWORD_UPDATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
