const Staff = require("../model/staffModel");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const { ValidateToken, GenerateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const Token = require("../model/token");
const { query } = require("express");
const Role = require("../model/role");
const { GenerateTokenMe } = require("../middleware/authRememberMe");
const StaffAttendance = require("../model/facultyAttendance");
const { calculateSkipAndLimit } = require("./service");
const mongoose = require("mongoose");

//Section - Create Staff
exports.addStaff = async (req, res) => {
  try {
    const { name, mobile, email, password, role } = req.body;
    const roleId = await Role.findById(role);
    if (!role) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    const EmailExist = await Staff.findOne({ email: email });
    if (EmailExist) return sendResponse(res, 400, null, Messages.EMAIL_EXISTS);

    const MobileExist = await Staff.findOne({ mobile: mobile });
    if (MobileExist)
      return sendResponse(res, 400, null, Messages.MOBILE_EXISTS);

    const hashedPassword = await bcrypt.hash(password?.trim(), 10);

    const data = new Staff({
      name: name,
      email: email,
      mobile: mobile,
      password: hashedPassword,
      role: roleId,
      createdBy: req?.meta?._id,
    });
    const result = await data.save();
    sendResponse(res, 200, result, Messages.STAFF_CREATED);
  } catch (error) {
    console.log("error", error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - logIn Staff
exports.logIn = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const staff = await Staff.findOne({ email: email });
    if (!staff) return sendResponse(res, 400, null, Messages.INVALID_EMAIL);

    const hashedPassword = await bcrypt.compare(password, staff.password);
    if (!hashedPassword)
      return sendResponse(res, 400, null, Messages.INVALID_PASSWORD);

    const loginDateAndTime = new Date();
    loginDateAndTime.setHours(loginDateAndTime.getHours() + 5);
    loginDateAndTime.setMinutes(loginDateAndTime.getMinutes() + 30);

    // Define the start and end of the day
    const startOfDay = new Date(loginDateAndTime);
    startOfDay.setHours(0, 0, 0, 1); // Set to 00:00:01 to start the day
    const endOfDay = new Date(loginDateAndTime);
    endOfDay.setHours(23, 59, 59, 999); // Set to 23:59:59.999 to end the day

    const attendanceMarked = await StaffAttendance.findOne({
      staffId: staff._id,
      loginDateAndTime: { $gte: startOfDay, $lte: endOfDay },
    });

    // console.log("attendanceMarked", attendanceMarked)
    if (!attendanceMarked) {
      const attendanceData = new StaffAttendance({
        staffId: staff._id,
        loginDateAndTime: loginDateAndTime, // Store the adjusted time
        isPresent: true,
      });
      await attendanceData.save();
    }

    if (rememberMe) {
      const token = GenerateTokenMe(staff._id);
      const user = await Token.findOne({ userId: staff._id });

      if (user) {
        const updateuser = await Token.findByIdAndUpdate(user._id, {
          token: token,
        });
      } else {
        const tokendata = new Token({
          token: token,
          userId: staff._id,
        });
        const data = await tokendata.save();
      }

      sendResponse(res, 200, { staff: staff, token: token });
    } else {
      const token = GenerateToken(staff._id);
      const user = await Token.findOne({ userId: staff._id });

      if (user) {
        const updateuser = await Token.findByIdAndUpdate(user._id, {
          token: token,
        });
      } else {
        const tokendata = new Token({
          token: token,
          userId: staff._id,
        });
        const data = await tokendata.save();
      }

      sendResponse(res, 200, { staff: staff, token: token });
    }
  } catch (err) {
    console.log("error", err);
    sendResponse(res, 500, null, Messages.STAFF_LOGIN);
  }
};

//Section - list Staff
exports.listStaff = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const searchAsNumber = !isNaN(Number(search)) ? Number(search) : null;
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            ...(searchAsNumber ? [{ mobile: searchAsNumber }] : []),
          ],
        }
      : {};

    const count = await Staff.countDocuments(query);
    const data = await Staff.find(query)
      .populate({
        path: "role",
        select: "roleName",
      })
      .populate({
        path: "createdBy",
        select: "name",
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    const totalPage = Math.ceil(count / parseInt(limit));
    sendResponse(res, 200, {
      data,
      totalPage: totalPage,
      count: count,
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.log("error", err);
    sendResponse(res, 500, null, Messages.DATA_RETRIVED);
  }
};

//Section - Logout Staff
exports.Logout = async (req, res) => {
  try {
    const data = await Token.findOne({ userId: req?.meta?._id });
    if (data) {
      const revoketoken = await Token.findByIdAndUpdate(data._id, {
        token: null,
      });
    }
    sendResponse(res, 200, null, "Log Out successfully");
  } catch (error) {
    console.log(error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - get Staff
exports.getStaff = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await Staff.findById(id);
    if (!data) sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - update Staff
exports.updateStaff = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, role, mobile } = req.body;

    const data = await Staff.findByIdAndUpdate(
      id,
      { name, email, role, mobile, updatedBy: req?.meta?._id },
      { returnDocument: "after" },
      { new: true }
    );
    if (!data) sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    sendResponse(res, 200, data, Messages.DATA_UPDATE);
  } catch (error) {
    console.log(error);
    sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - delete Staff
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the staff member by ID
    const staff = await Staff.findById(id).populate({
      path: "role",
      select: "roleName",
    });

    // If staff member does not exist, send 404 response with a "data not found" message
    if (!staff) {
      return sendResponse(res, 404, null, Messages.DATA_NOT_FOUND);
    }

    // Check if the staff member is a Super Admin and prevent deletion
    if (staff?.role?.roleName === "Super Admin") {
      return sendResponse(res, 400, null, "Super Admin cannot be deleted.");
    }

    // Proceed with deletion if not Super Admin
    await Staff.findByIdAndDelete(id);

    // Send successful deletion response
    return sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    console.error("Error deleting staff:", error);
    // Handle any server errors
    return sendResponse(res, 500, null, Messages.INTERNAL_ISSUE);
  }
};

//Section - List for faculty attendance
// exports.listFacultyAttendance = async (req, res) => {
//     try {
//         const { date } = req.body;
//         const { page, limit } = req.query;
//         const { skip, parsedLimit } = calculateSkipAndLimit(page, limit);
//         const startOfDay = new Date(date);
//         startOfDay.setUTCHours(0, 0, 0, 0);

//         const endOfDay = new Date(date);
//         endOfDay.setUTCHours(23, 59, 59, 999);

//         const staffs = await Staff.find()
//             .skip(skip)
//             .limit(parsedLimit);
//         const attendanceData = [];

//         for (const staff of staffs) {
//             const attendanceRecord = await StaffAttendance.findOne({
//                 staffId: staff._id,
//                 loginDateAndTime: {
//                     $gte: startOfDay,
//                     $lte: endOfDay
//                 }
//             });

//             attendanceData.push({
//                 staffId: staff._id,
//                 isPresent: !!attendanceRecord // True if attendance record exists, otherwise false
//             });
//         }
//         sendResponse(res, 200, attendanceData, Messages.DATA_RETRIVED)
//     } catch (error) {
//         res.status(500).json({
//             message: "An error occurred while fetching attendance",
//             error: error.message
//         });
//     }
// };

//Section - Update Faulty attendance
// exports.updateAttendance = async (req, res) => {
//     try {
//         const { staffId, date, isPresent } = req.body;

//         const startOfDay = new Date(date);
//         startOfDay.setUTCHours(0, 0, 0, 0);

//         // Set the time to 23:59:59 for end of the day
//         const endOfDay = new Date(date);
//         endOfDay.setUTCHours(23, 59, 59, 999);

//         await StaffAttendance.findOneAndUpdate(
//             { staffId, loginDateAndTime: date },
//             {
//                 $set: {
//                     isPresent
//                 }
//             }
//         )
//         sendResponse(res, 200, null, Messages.ATTENDANCE_UPDATE_SUCCESSFULLY);
//     } catch (error) {
//         sendResponse(res, 400, null, error.messages);
//     }
// }

//Section - faculty list (web)
exports.facultyList = async (req, res) => {
  try {
    const facultyList = await Staff.find().select("name");
    sendResponse(res, 200, facultyList, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.getCounsellorList = async (req, res) => {
  try {
    // Assuming "Counsellor" is the roleName for counselors
    const counsellorRole = await Role.findOne({ roleName: "Counsellor" });

    if (!counsellorRole) {
      return sendResponse(res, 404, null, "Counsellor role not found");
    }

    const counsellorList = await Staff.find({
      role: counsellorRole._id,
    }).select("name email");

    sendResponse(res, 200, counsellorList, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.isSuperAdmin = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) return false;
  const user = await Staff.findById(userId);
  if (!user) return false;
  const role = await Role.findById(user.role);
  if (!role) return false;
  return role.roleName === "Super Admin";
};
