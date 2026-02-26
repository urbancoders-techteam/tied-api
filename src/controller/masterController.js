const Role = require("../model/role");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const Otp = require("../model/otp");
const User = require("../model/studentModel");
const { GenerateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const FieldOfInterest = require("../model/fieldOfInterest");
const Country = require("../model/country");
const State = require("../model/state");
const University = require("../model/university");
const { uploadToS3 } = require("../helper/uploadToS3");
const FAQModel = require("../model/faq");

exports.addRole = async (req, res) => {
  try {
    const { roleName } = req.body;
    // const roleCheck = await Role.findOne({ roleName });
    // if (roleCheck) return sendResponse(res, 400, null, "Role name already exist");
    const existingData = await Role.findOne({
      roleName: { $regex: new RegExp(`^${roleName}$`, "i") },
    });
    if (existingData) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }

    const data = new Role({ roleName, createdBy: req?.meta?._id });
    const result = await data.save();
    sendResponse(res, 200, result, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

/*

exports.listRoles = async (req, res) =>
{
    try {
        const { page, limit } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const count = await Role.countDocuments();
        const data = await Role.find()
            .populate({
                path: "createdBy",
                select: "name",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        sendResponse(res, 200, {
            data,
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count,
            limit: parseInt(limit),
        });
    }  catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
*/
exports.listRoles = async (req, res) => {
  try {
    let { page, limit } = req.query;

    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;

    const skip = (page - 1) * limit;

    const count = await Role.countDocuments();
    const data = await Role.find()
      .populate({
        path: "createdBy",
        select: "name",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    sendResponse(res, 200, {
      data,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit: limit,
    });
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.getRole = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Role.findOne({ _id: id });
    if (!result) return sendResponse(res, 400, null, Message.DATA_NOT_FOUND);
    sendResponse(res, 200, result, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleName } = req.body;

    const check = await Role.findOne({ _id: id });
    if (!check) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    const roleCheck = await Role.findOne({ roleName });
    if (roleCheck) return sendResponse(res, 400, null, "Role name exist");

    const result = await Role.findByIdAndUpdate(
      id,
      { roleName, updatedBy: req?.meta?._id },
      { new: true }
    );
    sendResponse(res, 200, result, Messages.DATA_UPDATE);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);
    if (!role) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    if (role.roleName === "Super Admin")
      return sendResponse(
        res,
        400,
        null,
        "Super Admin role cannot be deleted."
      );
    await Role.findByIdAndDelete(id);
    sendResponse(res, 201, null, Messages.DATA_DELETED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: forget password USER (Generate Opt)
exports.forgotPasswordUser = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("Mobile"));
    }

    const checkUser = await User.findOne({ mobile: mobile });

    if (!checkUser) {
      return sendResponse(res, 400, null, Messages.MOBILE_NOT_EXISTS);
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const token = await GenerateToken(checkUser._id);

    await Otp.findOneAndUpdate(
      { mobile: mobile },
      {
        otp: otp,
        createdAt: Date.now(),
        isVerified: false,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    const formattedData = {
      mobile,
      otp,
      token,
    };

    sendResponse(res, 200, formattedData, Messages.OTP_SEND);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: verify otp USER
exports.verifyOtpUser = async (req, res) => {
  try {
    const id = req?.meta?._id;
    const { otp } = req.body;

    if (!otp) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("Otp"));
    }

    const checkUser = await User.findOne({ _id: id });
    if (!checkUser) {
      return sendResponse(res, 400, null, Messages.USER_NOT_FOUND);
    }

    const otpRecord = await Otp.findOne({ mobile: checkUser.mobile });

    if (!otpRecord) {
      return sendResponse(res, 400, null, Messages.OTP_EXPIRED);
    }

    if (otpRecord.isVerified) {
      return sendResponse(res, 400, null, Messages.OTP_ALREADY_VERIFIED);
    }

    if (otpRecord.otp !== otp) {
      return sendResponse(res, 400, null, Messages.INVALID_OTP);
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    return sendResponse(res, 200, otpRecord, Messages.OTP_VERIFIED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Reset password USER
exports.resetPassword = async (req, res) => {
  try {
    const id = req?.meta?._id;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      const missingField = !password ? "Password" : "Confirm Password";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    if (password === confirmPassword) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(id, { password: hashedPassword });
      sendResponse(res, 200, null, Messages.PASSWORD_RESET_SUCCESSFULLY);
    } else {
      return sendResponse(res, 400, null, Messages.PASSWORD_DOES_NOT_MATCH);
    }
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//CURD FOR FieldOfInterest
exports.createFieldOfInterest = async (req, res) => {
  const { name } = req.body;
  try {
    const existingData = await FieldOfInterest.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingData) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }
    const data = await FieldOfInterest.create({
      name,
      createdBy: req?.meta?._id,
    });
    sendResponse(res, 200, data, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.listFieldOfInterest = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const parsedLimit = limit ? parseInt(limit) : null;

    const count = await FieldOfInterest.countDocuments();
    const query = FieldOfInterest.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    if (parsedLimit) {
      query.skip(skip).limit(parsedLimit);
    }

    const data = await query.exec();
    const formattedData = data?.map((item) => ({
      _id: item?._id,
      name: item?.name ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
    }));
    sendResponse(res, 200, { count, formattedData }, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.listFieldOfInterestWeb = async (req, res) => {
  try {
    const count = await FieldOfInterest.countDocuments();
    const data = await FieldOfInterest.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 });
    const formattedData = data?.map((item) => ({
      _id: item?._id,
      name: item?.name ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
    }));
    sendResponse(res, 200, { count, formattedData }, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.getFieldOfInterest = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await FieldOfInterest.findById(id).populate([
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
    ]);
    if (!data) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.updateFieldOfInterest = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const data = await FieldOfInterest.findById(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    const existingData = await FieldOfInterest.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingData && existingData._id.toString() !== id) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }
    await FieldOfInterest.findByIdAndUpdate(id, {
      name,
      updatedBy: req?.meta?._id,
    });
    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.deleteFieldOfInterest = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await FieldOfInterest.findByIdAndDelete(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//CRUD for country
exports.addCountry = async (req, res) => {
  const { name, icon } = req.body;
  try {
    const existingData = await Country.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingData) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }
    const url = await uploadToS3(icon, "image");
    const data = await Country.create({
      name,
      icon: url,
      createdBy: req?.meta?._id,
    });
    sendResponse(res, 200, data, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.listCountry = async (req, res) => {
  const { page, limit } = req.query;
  const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
  const parsedLimit = limit ? parseInt(limit) : null;
  try {
    const count = await Country.countDocuments();
    const query = Country.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    if (parsedLimit) {
      query.skip(skip).limit(parsedLimit);
    }

    const data = await query.exec();
    const formattedData = data.map((item) => ({
      _id: item?._id,
      name: item?.name ?? null,
      icon: item?.icon ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
    }));
    sendResponse(res, 200, { count, formattedData }, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.listCountryWeb = async (req, res) => {
  try {
    let { page, limit } = req.query;

    // If page or limit are not provided, fetch all data without pagination
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const parsedLimit = limit ? parseInt(limit) : null;

    const count = await Country.countDocuments();
    const query = Country.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    if (parsedLimit) {
      query.skip(skip).limit(parsedLimit);
    }

    const data = await query.exec();

    const formattedData = data.map((item) => ({
      _id: item?._id,
      name: item?.name ?? null,
      icon: item?.icon ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
    }));

    sendResponse(res, 200, { count, formattedData }, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.getCountry = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await Country.findById(id).populate([
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
    ]);
    if (!data) {
      return sendResponse(res, 400, null, Messages.COUNTRY_NOT_FOUND);
    }
    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.updateCountry = async (req, res) => {
  const { id } = req.params;
  const { name, icon } = req.body;
  try {
    const data = await Country.findById(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.COUNTRY_NOT_FOUND);
    }
    const existingData = await Country.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingData && existingData._id.toString() !== id) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }
    //base64 check
    const base64Regex = /^data:image\/[a-z]+;base64,/;
    if (base64Regex.test(icon)) {
      const url = await uploadToS3(icon, "image");
      await Country.findByIdAndUpdate(id, {
        name,
        icon: url,
        updatedBy: req?.meta?._id,
      });
      return sendResponse(res, 200, null, Messages.DATA_UPDATE);
    }
    await Country.findByIdAndUpdate(id, {
      name,
      updatedBy: req?.meta?._id,
    });
    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.deleteCountry = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await Country.findByIdAndDelete(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.COUNTRY_NOT_FOUND);
    }
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//CRUD for State
exports.addState = async (req, res) => {
  const { countryId, stateName, image } = req.body;
  try {
    const checkCountry = await Country.findById(countryId);
    if (!checkCountry) {
      return sendResponse(res, 400, null, Messages.COUNTRY_NOT_FOUND);
    }

    const duplicateStates = await State.findOne({
      countryId: countryId,
      name: stateName,
    });

    if (duplicateStates) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }
    const url = await uploadToS3(image, "image");
    const data = await State.create({
      countryId,
      name: stateName,
      image: url,
      createdBy: req?.meta?._id,
    });
    sendResponse(res, 200, data, Messages.DATA_CREATED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.listState = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const parsedLimit = limit ? parseInt(limit) : null;

    const count = await State.countDocuments();
    const query = State.find()
      .populate([
        { path: "countryId", select: "name" },
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    if (parsedLimit) {
      query.skip(skip).limit(parsedLimit);
    }

    const data = await query.exec();

    const formattedData = data.map((item) => ({
      _id: item?._id ?? null,
      countryId: item?.countryId?._id ?? null,
      countryName: item?.countryId?.name ?? null,
      state: item?.name ?? null,
      image: item?.image ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
    }));
    sendResponse(res, 200, { count, formattedData }, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.listStateWeb = async (req, res) => {
  try {
    const count = await State.countDocuments();
    const data = await State.find()
      .populate([
        { path: "countryId", select: "name" },
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 });
    const formattedData = data.map((item) => ({
      _id: item?._id ?? null,
      countryId: item?.countryId?._id ?? null,
      countryName: item?.countryId?.name ?? null,
      state: item?.name ?? null,
      image: item?.image ?? null,
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
    }));
    sendResponse(res, 200, { count, formattedData }, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.getStates = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await State.findById(id).populate([
      { path: "countryId", select: "name" },
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
    ]);
    if (!data) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { stateName, image, countryId } = req.body;
    const data = await State.findById(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    const checkCountry = await Country.findById(countryId);
    if (!checkCountry) {
      return sendResponse(res, 400, null, Messages.COUNTRY_NOT_FOUND);
    }

    const duplicateStates = await State.findOne({
      countryId: countryId,
      name: stateName,
    });
    if (duplicateStates && duplicateStates._id.toString() !== id) {
      return sendResponse(res, 400, null, Messages.DUPLICATE_DATA);
    }

    const base64Regex = /^data:image\/[a-z]+;base64,/;
    if (base64Regex.test(image)) {
      const url = await uploadToS3(image, "image");
      await State.findByIdAndUpdate(id, {
        $set: {
          countryId,
          name: stateName,
          image: url,
          updatedBy: req?.meta?._id,
        },
      });
      return sendResponse(res, 200, null, Messages.DATA_UPDATE);
    }
    await State.findByIdAndUpdate(id, {
      $set: {
        countryId,
        name: stateName,
        updatedBy: req?.meta?._id,
      },
    });
    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

exports.deleteState = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await State.findById(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    await State.findByIdAndDelete(id);
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//CRUD for university
exports.addUnversity = async (req, res) => {
  try {
    const {
      name,
      image,
      countryId,
      pursue,
      year,
      intake,
      duration,
      courses,
      tutionFee,
      admissionRequirement,
      highestQualification,
      scholarAvailability,
      language,
      rating,
      webLink,
      qsRanking,
    } = req.body;
    const checkCountry = await Country.findById(countryId);
    if (!checkCountry) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    // const url = await uploadToS3(image, 'image');
    const data = await University.create({
      name,
      image,
      countryId,
      pursue,
      year,
      intake,
      duration,
      courses,
      tutionFee,
      admissionRequirement,
      highestQualification,
      scholarAvailability,
      language,
      rating,
      webLink,
      qsRanking,
      createdBy: req.meta?._id || null,
    });
    sendResponse(res, 200, data, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.listUniversity = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const parsedLimit = limit ? parseInt(limit) : null;

    const count = await University.countDocuments();
    const query = University.find()
      .populate([
        { path: "countryId", select: "name icon" },
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    if (parsedLimit) {
      query.skip(skip).limit(parsedLimit);
    }

    const data = await query.exec();

    const allCourseIds = [...new Set(data.flatMap((ele) => ele.courses || []))];

    const coursesMap = {};
    if (allCourseIds.length) {
      const coursesData = await FieldOfInterest.find({
        _id: { $in: allCourseIds },
      }).lean();
      coursesData.forEach((c) => {
        coursesMap[c._id.toString()] = c.name;
      });
    }

    const formattedData = data?.map((ele) => ({
      _id: ele?._id,
      name: ele?.name ?? null,
      image: ele?.image ?? null,
      countryId: ele?.countryId?._id ?? null,
      countryName: ele?.countryId?.name ?? null,
      countryIcon: ele?.countryId?.icon ?? null,
      pursue: ele?.pursue ?? null,
      year: ele?.year ?? null,
      intake: ele?.intake ?? null,
      duration: ele?.duration ?? null,
      courses: (ele?.courses || []).map(
        (id) => coursesMap[id.toString()] || id
      ),
      currency: ele?.currency ?? null,
      tutionFee: ele?.tutionFee ?? null,
      admissionRequirement: ele?.admissionRequirement ?? null,
      highestQualification: ele?.highestQualification ?? null,
      scholarAvailability: ele?.scholarAvailability ?? null,
      language: ele?.language ?? null,
      rating: ele?.rating ?? null,
      webLink: ele?.webLink ?? null,
      qsRanking: ele?.qsRanking ?? null,
      createdBy: ele?.createdBy?.name ?? null,
      updatedBy: ele?.updatedBy?.name ?? null,
      createdAt: ele?.createdAt ?? null,
    }));

    sendResponse(res, 200, { count, formattedData }, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.getUniversity = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await University.findById(id).populate([
      { path: "countryId", select: "name icon" },
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
    ]);
    if (!data) {
      return sendResponse(res, 400, null, Messages.UNIVERSITY_NOT_FOUND);
    }
    const formattedData = {
      _id: data?._id,
      name: data?.name ?? null,
      image: data?.image ?? null,
      countryId: data?.countryId?._id ?? null,
      countryName: data?.countryId?.name ?? null,
      countryIcon: data?.countryId?.icon ?? null,
      pursue: data?.pursue ?? null,
      year: data?.year ?? null,
      intake: data?.intake ?? null,
      duration: data?.duration ?? null,
      courses: data?.courses ?? [],
      tutionFee: data?.tutionFee ?? null,
      admissionRequirement: data?.admissionRequirement ?? null,
      highestQualification: data?.highestQualification ?? null,
      scholarAvailability: data?.scholarAvailability ?? null,
      language: data?.language ?? null,
      rating: data?.rating ?? null,
      webLink: data?.webLink ?? null,
      qsRanking: data?.qsRanking ?? null,
      createdBy: data?.createdBy?.name ?? null,
      updatedBy: data?.updatedBy?.name ?? null,
    };
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.updateUnversity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      image,
      countryId,
      pursue,
      year,
      intake,
      duration,
      courses,
      tutionFee,
      admissionRequirement,
      highestQualification,
      scholarAvailability,
      language,
      rating,
      webLink,
      qsRanking,
    } = req.body;

    const checkUniversity = await University.findById(id);
    if (!checkUniversity) {
      return sendResponse(res, 400, null, Messages.UNIVERSITY_NOT_FOUND);
    }

    const checkCountry = await Country.findById(countryId);
    if (!checkCountry) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    await University.findByIdAndUpdate(id, {
      $set: {
        name,
        image,
        countryId,
        pursue,
        year,
        intake,
        duration,
        courses,
        tutionFee,
        admissionRequirement,
        highestQualification,
        scholarAvailability,
        language,
        rating,
        webLink,
        qsRanking,
        updatedBy: req?.meta?._id,
      },
    });
    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.deleteUniversity = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await University.findById(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.UNIVERSITY_NOT_FOUND);
    }
    await University.findByIdAndDelete(id);
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// CRUD for FAQ
exports.addFAQ = async (req, res) => {
  try {
    const { question, answer } = req.body;
    const faq = new FAQModel({
      question,
      answer,
      createdBy: req?.meta?._id,
    });

    await faq.save();
    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.listFAQ = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);
    const count = await FAQModel.countDocuments();
    const FAQ = await FAQModel.find()
      .populate({
        path: "createdBy",
        select: "name",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const formattedData = FAQ?.map((item) => ({
      _id: item?._id ?? null,
      question: item?.question ?? null,
      answer: item?.answer ?? null,
      createdBy: item?.createdBy ?? null,
      createdAt: item?.createdAt ?? null,
    }));

    sendResponse(res, 200, { count, formattedData }, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.getFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const FAQ = await FAQModel.findById(id).populate([
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
    ]);
    if (!FAQ) {
      sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, FAQ, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;
    const FAQById = await FAQModel.findById(id);
    if (!FAQById) {
      sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    await FAQModel.findByIdAndUpdate(id, {
      $set: {
        question,
        answer,
        updatedBy: req?.meta?._id,
      },
    });
    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.deleteFAQ = async (req, res) => {
  try {
    const faqDelete = await FAQModel.findByIdAndDelete(req.params.id);
    if (!faqDelete) {
      sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

//FAQ for web
exports.webList = async (req, res) => {
  try {
    const FAQ = await FAQModel.find().sort({ createdAt: -1 });

    const formattedData = FAQ?.map((item) => ({
      _id: item?._id ?? null,
      question: item?.question ?? null,
      answer: item?.answer ?? null,
    }));
    sendResponse(res, 200, formattedData, Messages.DATA_FETCHED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Get state by Country
exports.byCountryId = async (req, res) => {
  try {
    const { countryId } = req.body;
    const state = await State.find({ countryId: countryId }).select(
      "name image"
    );
    // .populate({ path: "countryId", select: "name" })
    sendResponse(res, 200, state, Messages.DATA_RETRIVED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
