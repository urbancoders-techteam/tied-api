const Student = require("../model/studentModel");
const PersonalCounsellor = require("../model/personalCounsellor.js");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const { GenerateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const Token = require("../model/token");
const Plan = require("../model/plan.js");
const PaymentModel = require("../model/payment.js");
const Order = require("../model/order");
const UserAssignTest = require("../model/userAssignTestDetails.js");
const Test = require("../model/test.js");
const { GenerateTokenMe } = require("../middleware/authRememberMe");
const { getCurrentISTTime } = require("../helper/lib");

const {
  getSignedUrlImage,
  deleteImageFromS3,
  s3Upload,
} = require("../helper/uploadToS3");
const UserProductDetails = require("../model/userProductDetail");
const Banner = require("../model/Banner");
const EnrollementForm = require("../model/enrollementForm");
const Staff = require("../model/staffModel");
const Schedule = require("../model/schedule");
const GetInTouch = require("../model/getInTouch");
const ScheduleMeeting = require("../model/scheduleMeeting");
const { getFutureDateTime, isBase64 } = require("../helper/lib");
const { generateOrderUniqueID } = require("../middleware/generateUniqueId.js");
const Role = require("../model/role.js");
const {
  generateRazorpayOrderId,
} = require("../middleware/generateRazorPay.js");
const staffModel = require("../model/staffModel");
const { default: mongoose } = require("mongoose");
const Batch = require("../model/batch.js");

//SECTION - Student SignUp
exports.signUp = async (req, res) => {
  try {
    const { username, password, email, mobile } = req.body;
    const EmailExist = await Student.findOne({ email: email });
    if (EmailExist) return sendResponse(res, 400, null, Messages.EMAIL_EXISTS);

    const hashedPassword = await bcrypt.hash(password?.trim(), 10);

    const student = new Student({
      username: username,
      email: email,
      mobile: mobile,
      password: hashedPassword,
    });
    const token = GenerateToken(student._id);
    const user = await Token.findOne({ userId: student._id });

    if (user) {
      const updateuser = await Token.findByIdAndUpdate(user._id, {
        token: token,
      });
    } else {
      const tokendata = new Token({
        token: token,
        userId: student._id,
      });
      const data = await tokendata.save();
    }
    const result = await student.save();
    sendResponse(res, 200, { result, token }, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Student Login
exports.logIn = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) return sendResponse(res, 400, null, Messages.INVALID_EMAIL);

    const hashedPassword = await bcrypt.compare(password, student.password);
    if (!hashedPassword)
      return sendResponse(res, 400, null, Messages.INVALID_PASSWORD);

    const checkPaid = await Order.findOne({ createdBy: student._id });
    let checker = false;
    if (checkPaid?.paymentStatus === "paid") {
      checker = true;
    }

    if (rememberMe) {
      const token = GenerateTokenMe(student._id);
      const user = await Token.findOne({ userId: student._id });

      if (user) {
        const updateuser = await Token.findByIdAndUpdate(user._id, {
          token: token,
        });
      } else {
        const tokendata = new Token({
          token: token,
          userId: student._id,
        });
        const data = await tokendata.save();
      }
      sendResponse(
        res,
        200,
        { token: token, student: student, order: checker },
        Messages.STUDENT_LOGIN
      );
    } else {
      const token = GenerateToken(student._id);
      const user = await Token.findOne({ userId: student._id });

      if (user) {
        const updateuser = await Token.findByIdAndUpdate(user._id, {
          token: token,
        });
      } else {
        const tokendata = new Token({
          token: token,
          userId: student._id,
        });
        const data = await tokendata.save();
      }
      sendResponse(
        res,
        200,
        { token: token, student: student, order: checker },
        Messages.STUDENT_LOGIN
      );
    }
  } catch (err) {
    return sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
  }
};

//Section - Logout
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
    sendResponse(res, 500, null, error.message);
  }
};

// Section - List student

exports.studentList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      isEnrolled,
      search,
      role, // roleId coming from frontend
      staffId,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const filter = {};

    // Step 1: check roleId → roleName
    if (role) {
      const roleData = await Role.findById(role).select("roleName").lean();
      if (roleData && roleData?.roleName?.toLowerCase() === "counsellor") {
        filter.counsellorId = staffId; // only restrict if counsellor
      }
    }

    if (isEnrolled) {
      filter.isenrolled = isEnrolled;
    }

    if (search) {
      const searchAsNumber = !isNaN(Number(search)) ? Number(search) : null;
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        ...(searchAsNumber ? [{ mobile: searchAsNumber }] : []),
      ];
    }

    const count = await Student.countDocuments(filter);

    const students = await Student.find(filter)
      .populate([
        { path: "createdBy", select: "name" },
        { path: "counsellorId", select: "name" },
      ])
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const formattedData = await Promise.all(
      students.map(async (item) => {
        const userProducts = await UserProductDetails.find({
          userId: item._id,
        }).populate([
          { path: "planId", select: "title" },
          { path: "productId", select: "title" },
        ]);

        let courses = { plans: [], createdAt: null, updatedAt: null };

        if (userProducts.length) {
          const productCreatedAt = userProducts.reduce(
            (earliest, entry) =>
              !earliest || entry.createdAt < earliest
                ? entry.createdAt
                : earliest,
            null
          );

          const productUpdatedAt = userProducts.reduce(
            (latest, entry) =>
              !latest || entry.updatedAt > latest ? entry.updatedAt : latest,
            null
          );

          courses = {
            plans: userProducts.map((ele) => ele?.planId?.title),
            createdAt: productCreatedAt,
            updatedAt: productUpdatedAt,
          };
        }

        return {
          _id: item._id,
          username: item?.username ?? null,
          email: item?.email ?? null,
          isenrolled: item?.isenrolled ?? false,
          isStudyAbroadApproved: item?.isStudyAbroadApproved ?? false,
          psychometricTest:
            item?.studyAbroadDetails?.personalizedMentoring?.psychometricTest ??
            false,
          createdBy: item?.createdBy?.name ?? null,
          createdAt: item?.createdAt ?? null,
          updatedAt: item?.updatedAt ?? null,
          courses,
          counsellorName: item?.counsellorId?.name ?? null,
        };
      })
    );

    sendResponse(res, 200, {
      formattedData,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parsedLimit),
      totalItems: count,
      limit: parsedLimit,
    });
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Get Assigned or Unassigned Students for a Batch

exports.getStudentsForBatch = async (req, res) => {
  try {
    const { batchId, type, role, staffId } = req.query;

    if (!batchId) {
      return sendResponse(res, 400, null, "Batch ID is required");
    }

    if (!["assigned", "unassigned"].includes(type)) {
      return sendResponse(
        res,
        400,
        null,
        "Type must be 'assigned' or 'unassigned'"
      );
    }

    // Step 1: check roleId → roleName
    let isCounsellor = false;
    if (role) {
      const roleData = await Role.findById(role).select("roleName").lean();
      if (roleData && roleData.roleName.toLowerCase() === "counsellor") {
        isCounsellor = true;
      }
    }

    const batch = await Batch.findById(batchId).populate({
      path: "students",
      select: "_id username email counsellorId",
    });

    if (!batch) {
      return sendResponse(res, 404, null, "Batch not found");
    }

    if (type === "assigned") {
      let assignedStudents = batch.students;
      // If counsellor → filter only students of this counsellor
      if (isCounsellor) {
        assignedStudents = assignedStudents.filter(
          (student) =>
            student.counsellorId && student.counsellorId.toString() === staffId
        );
      }

      const formattedAssigned = assignedStudents.map((student) => ({
        _id: student._id,
        name: student.username ?? null,
        email: student.email ?? null,
      }));

      return sendResponse(
        res,
        200,
        formattedAssigned,
        "Assigned students fetched successfully"
      );
    }

    // For unassigned students
    const assignedStudentIds = batch.students.map((id) => id._id.toString());

    let unassignedQuery = { _id: { $nin: assignedStudentIds } };

    // If counsellor → show only counsellor’s own unassigned students
    if (isCounsellor) {
      unassignedQuery.counsellorId = staffId;
    }

    const unassignedStudents = await Student.find(unassignedQuery, {
      _id: 1,
      username: 1,
      email: 1,
    }).sort({ username: 1 });

    const formattedUnassigned = unassignedStudents.map((student) => ({
      _id: student._id,
      name: student.username ?? null,
      email: student.email ?? null,
    }));

    return sendResponse(
      res,
      200,
      formattedUnassigned,
      "Unassigned students fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching students:", error);
    sendResponse(res, 500, null, error.message || "Internal server error");
  }
};

//SECTION - Get student by Id (Web)
exports.studentGet = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await Student.findById(id).select(
      "username email mobile location documents image isenrolled isStudyAbroadApproved "
    );
    if (!student) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    // Generate signed URLs for documents
    const documentsWithSignedUrls = await Promise.all(
      (student?.documents ?? []).map(async (ele) => ({
        url: ele?.url ? await getSignedUrlImage(ele.url) : null,
      }))
    );
    const formattedData = {
      _id: student?._id,
      username: student?.username ?? null,
      email: student?.email ?? null,
      mobile: student?.mobile ?? null,
      location: student?.location ?? null,
      image: student?.image ? await getSignedUrlImage(student?.image) : null,
      isenrolled: student?.isenrolled ?? null,
      isStudyAbroadApproved: student?.isStudyAbroadApproved ?? null,
      documents: documentsWithSignedUrls,
    };
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Student profile update
exports.studentUpdate = async (req, res) => {
  const { id } = req.meta;
  const { username, email, mobile, location, image, documents } = req.body;

  try {
    const student = await Student.findById(id);
    if (!student) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    const EmailExist = await Student.findOne({
      email,
      _id: { $ne: id },
    });
    if (EmailExist) return sendResponse(res, 400, null, Messages.EMAIL_EXISTS);

    // Handle image update
    let imageKey = student.image;
    if (isBase64(image)) {
      if (student.image) {
        await deleteImageFromS3(student.image);
      }
      imageKey = await s3Upload(image, "image");
    }

    // Handle document update
    let documentKeys = student.documents;
    if (Array.isArray(documents) && documents.length) {
      const updatedDocs = await Promise.all(
        documents.map(async (doc, index) => {
          const isSignedUrl =
            typeof doc.url === "string" && doc.url.includes("X-Amz-");
          if (doc.url && isBase64(doc.url)) {
            // Delete old doc if exists
            const oldDoc = student.documents?.[index];
            if (oldDoc?.url) {
              await deleteImageFromS3(oldDoc.url);
            }

            const newKey = await s3Upload(doc.url, "pdf");
            return { url: newKey };
          } else if (!isBase64(doc.url) && !isSignedUrl) {
            // Consider it's a raw S3 key, not signed URL or base64
            return { url: doc.url };
          } else {
            // It's a signed URL – ignore update
            return student.documents?.[index] ?? null;
          }
        })
      );

      documentKeys = updatedDocs.filter(Boolean);
    }

    // Final update
    const update = await Student.findByIdAndUpdate(
      id,
      {
        $set: {
          username,
          email,
          mobile,
          location,
          image: imageKey,
          documents: documentKeys,
        },
      },
      { new: true }
    );

    sendResponse(res, 200, update, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - delete student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);
    if (!student) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Get Student purchase list
exports.StudentPurchase = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const student = await UserProductDetails.find({ userId: userId }).select(
      "planId"
    );
    const planIds = student?.map((item) => item.planId);

    const purchase = await Banner.find({ courseId: { $in: planIds } }).populate(
      [{ path: "courseId", select: "title" }]
    );
    const formattedData = await Promise.all(
      purchase?.map(async (item) => {
        const imageURL = item?.image ?? null;
        return {
          courseId: item?.courseId?._id ?? null,
          courseName: item?.courseId?.title ?? null,
          date: item?.date ?? null,
          title: item?.title ?? null,
          description: item?.description ?? null,
          image: await getSignedUrlImage(imageURL),
        };
      })
    );
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    res.status(400).json(error.message);
  }
};

//SECTION - Get enrollment form base on userId
exports.getEnrollementForm = async (req, res) => {
  try {
    const { userId } = req.query;
    const data = await EnrollementForm.findOne({ userId: userId });
    const formattedData = {
      _id: data?._id,
      information: data?.information ?? {},
      academicBackground: data?.academicBackground?.map((ele) => ({
        _id: ele?._id,
        academic: ele?.academic,
        marks: ele?.marks,
        yearOfPassing: ele?.yearOfPassing,
        degree: ele?.degree,
        college: ele?.college,
        university: ele?.university,
      })),
      workExperience: data?.workExperience?.map((ele) => ({
        _id: ele?._id,
        companyName: ele?.companyName,
        designation: ele?.designation,
        duration: ele?.duration,
      })),
      studentDetail: data?.studentDetail ?? {},
      permanentaddress: data?.permanentAddress ?? {},
      mailingAddress: data?.mailingAddress ?? {},
      taksheelaKnowAbout: data?.taksheelaKnowAbout ?? null,
      newsPaper: data?.newsPaper ?? null,
      internetAt: data?.internetAt ?? null,
      course: data?.course?.map((ele) => ({
        _id: ele?._id,
        CourseName: ele?.courseName,
        FullCourse: ele?.fullCourse,
        MockTest: ele?.mockTest,
        Fee: ele?.fee,
      })),
      friendsName: data?.friendsName?.map((ele) => ({
        _id: ele?._id,
        name: ele?.name,
        address: ele?.address,
        mobileNumber: ele?.mobileNumber,
        email: ele?.email,
      })),
    };
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Student Schedule API
exports.studentSchedule = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { fullName, scheduleDate, facultyId, queries } = req.body;

    // Check if the specified faculty exists
    const staff = await Staff.findById(facultyId);
    if (!staff) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateChecker = new Date(scheduleDate);
    if (dateChecker < today) {
      return sendResponse(
        res,
        400,
        null,
        "You cannot Scheduled your date in past"
      );
    }
    await Schedule.create({
      userId,
      fullName,
      scheduleDate,
      faculty: facultyId,
      queries,
    });
    sendResponse(res, 200, null, Messages.SCHEDULED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Faculty list API
exports.facultyList = async (req, res) => {
  try {
    const faculty = await Staff.find().select("name");
    sendResponse(res, 200, faculty, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// Get in touch
exports.getInTouch = async (req, res) => {
  try {
    const createdBy = req?.meta?._id; // Student ID (who is logged in)
    const { mobile, email, remark } = req.body;

    const newUser = new GetInTouch({
      createdBy, // 👈 save Student ID in createdBy
      mobile,
      email,
      remark,
    });

    const savedUser = await newUser.save();

    res.status(201).json(savedUser);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// 📌 Get all GetInTouch entries (Admin) with pagination
exports.getAllGetInTouch = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const filter = {};

    // 🔍 Search (optional) by email, remark, mobile
    if (search) {
      const searchAsNumber = !isNaN(Number(search)) ? Number(search) : null;
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { remark: { $regex: search, $options: "i" } },
        ...(searchAsNumber ? [{ mobile: searchAsNumber }] : []),
      ];
    }

    const count = await GetInTouch.countDocuments(filter);

    const users = await GetInTouch.find(filter)
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    // Format response
    const formattedData = users.map((item) => ({
      _id: item._id,
      email: item?.email ?? null,
      mobile: item?.mobile ?? null,
      remark: item?.remark ?? null,
      createdBy: item?.createdBy
        ? { id: item.createdBy._id, username: item.createdBy.username }
        : null,
      createdAt: item?.createdAt ?? null,
      updatedAt: item?.updatedAt ?? null,
    }));

    sendResponse(res, 200, {
      formattedData,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parsedLimit),
      totalItems: count,
      limit: parsedLimit,
    });
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// 📌 Delete GetInTouch entry by ID (Admin)
exports.deleteGetInTouch = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await GetInTouch.findByIdAndDelete(id);

    if (!deletedUser) {
      return sendResponse(res, 404, null, "Entry not found");
    }

    sendResponse(res, 200, null, "Deleted successfully");
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Get student
exports.studentGetWeb = async (req, res) => {
  const { id } = req.meta;
  try {
    const student = await Student.findById(id).select(
      "username email mobile location documents image isenrolled"
    );
    if (!student) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    // Generate signed URLs for documents
    const documentsWithSignedUrls = await Promise.all(
      (student?.documents ?? []).map(async (ele) => ({
        url: ele?.url ? await getSignedUrlImage(ele.url) : null,
      }))
    );

    const formattedData = {
      _id: student?._id,
      username: student?.username ?? null,
      email: student?.email ?? null,
      mobile: student?.mobile ?? null,
      location: student?.location ?? null,
      image: student?.image ? await getSignedUrlImage(student?.image) : null,
      isenrolled: student?.isenrolled ?? null,
      documents: documentsWithSignedUrls,
    };
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};

//SECTION - schedule meeting form
exports.scheduleMeetingForm = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    const newMeeting = new ScheduleMeeting({
      name,
      phone,
      email,
      createdAt: getCurrentISTTime(),
    });

    // Conditionally set createdBy if token is present
    if (req.meta && req?.meta?._id) {
      newMeeting.createdBy = req?.meta?._id;
    }

    await newMeeting.save();
    sendResponse(res, 200, null, Messages.MEETING_SCHEDULED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - get scheduled meeting in admin
exports.getScheduledMeeting = async (req, res) => {
  try {
    const staffId = req?.meta?._id;

    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const { page = 1, limit = 10, date, search } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // ---------- SEARCH LOGIC  ----------
    const searchAsNumber = !isNaN(Number(search)) ? Number(search) : null;

    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            ...(searchAsNumber ? [{ phone: searchAsNumber }] : []),
          ],
        }
      : {};

    // ---------- DATE FILTER ----------
    const dateFilter = {};
    if (date) {
      const parsedDate = new Date(date);
      const nextDate = new Date(parsedDate);
      nextDate.setDate(parsedDate.getDate() + 1);

      dateFilter.createdAt = {
        $gte: parsedDate,
        $lt: nextDate,
      };
    }

    // Combine filters
    const finalFilter = { ...searchQuery, ...dateFilter };

    // Count total documents for pagination
    const totalCount = await ScheduleMeeting.countDocuments(finalFilter);

    // Fetch paginated meetings
    const scheduledMeeting = await ScheduleMeeting.find(finalFilter)
      .populate({ path: "createdBy", select: "username" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    // Format response data
    const formattedData = scheduledMeeting.map((item) => ({
      _id: item._id,
      name: item.name,
      phone: item.phone,
      email: item.email,
      createdBy: item?.createdBy?.username ?? null,
      createdAt: item?.createdAt ?? null,
      updatedAt: item?.updatedAt ?? null,
    }));

    sendResponse(
      res,
      200,
      {
        count: totalCount,
        meetings: formattedData,
        totalPage: Math.ceil(totalCount / parsedLimit),
        currentPage: parsedPage,
      },
      Messages.DATA_FETCHED
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Update Schedule Meeting Status (Admin)
exports.updateMeetingStatus = async (req, res) => {
  try {
    const staffId = req?.meta?._id;
    const { meetingId, scheduleStatus } = req.body;

    if (
      !meetingId ||
      !scheduleStatus ||
      !["pending", "completed"].includes(scheduleStatus)
    ) {
      const missingField = !meetingId
        ? "Meeting ID"
        : !scheduleStatus
        ? "Schedule Status"
        : "Valid Schedule Status";

      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    const [staffExist, meeting] = await Promise.all([
      Staff.findById(staffId),
      ScheduleMeeting.findById(meetingId),
    ]);

    if (!staffExist || !meeting) {
      const missing = !staffExist ? "Staff" : "Meeting";
      return sendResponse(res, 400, null, Messages.NOT_FOUND_DATA(missing));
    }

    // Update meeting status
    await ScheduleMeeting.findByIdAndUpdate(meetingId, {
      $set: {
        scheduleStatus,
        updatedBy: staffId,
        updatedAt: getCurrentISTTime(),
      },
    });

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION -  Method to create Student from admin
exports.createStudent = async (req, res) => {
  try {
    const createdBy = req?.meta?._id;
    const { username, password, email, mobile } = req.body;

    const duplicteData = await Student.findOne({
      $or: [{ email: email }, { mobile: mobile }],
    });
    if (duplicteData)
      return sendResponse(res, 400, null, Messages.DUPLICATE_EMAIL_OR_PHONE);

    const hashedPassword = await bcrypt.hash(password?.trim(), 10);

    const student = await Student.create({
      username: username,
      email: email,
      mobile: mobile,
      password: hashedPassword,
      createdBy,
      createdAt: getFutureDateTime(),
      updatedAt: getFutureDateTime(),
    });
    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {}
};

// SECTION - Method to delete Student (only if not enrolled)
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params; // student _id

    // 1. Find student by ID
    const student = await Student.findById(id);

    if (!student) {
      return sendResponse(res, 404, null, "Student not found");
    }

    // 2. Check enrollment
    if (student.isenrolled) {
      return sendResponse(res, 400, null, "Cannot delete enrolled student");
    }

    // 3. Delete student
    await Student.findByIdAndDelete(id);

    return sendResponse(res, 200, null, "Student deleted successfully");
  } catch (error) {
    return sendResponse(res, 500, null, error.message);
  }
};

//SECTION - Method to assign course to student from admin
exports.assignCourse = async (req, res) => {
  try {
    const { userId, planIds } = req.body;
    const id = req?.meta?._id;

    const staffId = await staffModel.findById(id);
    let assignedBy = "";

    if (staffId) {
      assignedBy = staffId?._id;
    }

    const student = await Student.findById({ _id: userId });
    if (!student) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    // Fetch plan details using the provided planIds
    const plans = await Plan.find({ _id: { $in: planIds } });
    if (!plans.length) {
      return sendResponse(res, 400, null, Messages.INVALID_PLAN);
    }

    // Calculate totalAmount
    const totalAmount = plans.reduce(
      (sum, plan) => sum + (plan.packagePrice || 0),
      0
    );

    const generateOrderId = await generateOrderUniqueID();
    const razorpayOrderId = await generateRazorpayOrderId(totalAmount);
    const paymentDate = getFutureDateTime();

    // Create Order
    const data = await Order.create({
      orderId: generateOrderId,
      dateOfPurchase: paymentDate,
      razorpayOrderId: razorpayOrderId,
      amount: totalAmount,
      paymentStatus: "paid", // Set as paid for zero payment flow
      plans: plans.map((plan) => ({
        planName: plan.title,
        amount: plan.packagePrice,
        planId: plan.planId,
      })),
      paymentFrom: "admin",
      createdBy: userId,
      createdAt: getFutureDateTime(),
    });

    // Create Payment Record
    await PaymentModel.create({
      orderId: data?.id,
      totalAmount: totalAmount,
      createdBy: userId,
      paymentDate: getFutureDateTime(),
      paymentStatus: "paid", // Mark as paid
    });

    // Assign plans to user in UserProductDetails
    await Promise.all(
      plans.map(async (plan) => {
        // Check if the user already has this plan
        const existingProduct = await UserProductDetails.findOne({
          userId: student._id,
          planId: plan._id,
        }).sort({ createdAt: -1 });

        if (existingProduct) {
          // Update existing product with the new order ID
          await UserProductDetails.findByIdAndUpdate(existingProduct._id, {
            $set: { orderId: data._id },
          });
        } else {
          // Create new UserProductDetails entry
          await UserProductDetails.create({
            userId: student._id,
            orderId: data._id,
            planId: plan._id,
            productId: plan.id,
            paymentFrom: "admin",
            productId: plan.planId, // Using 'planId' for 'productId'
            createdBy: student._id,
            createdAt: getFutureDateTime(),
            assignedBy,
          });
        }
      })
    );

    sendResponse(res, 200, data, Messages.DATA_CREATED);
  } catch (error) {
    console.error("Error:", error);
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Method to assign test to student from admin
exports.assignTest = async (req, res) => {
  try {
    const createdBy = req?.meta?._id;
    const { testId, userId } = req.body;

    if (!Array.isArray(userId) || userId.length === 0) {
      return sendResponse(res, 400, null, "Invalid userId array.");
    }

    const testData = await Test.findById(testId);
    if (!testData) {
      return sendResponse(res, 400, null, "Test not found.");
    }

    // Remove existing assignments for the given testId
    await UserAssignTest.deleteMany({ testId: testData._id });

    // Create new assignments
    const assignments = userId.map((ele) => ({
      userId: ele,
      testId: testData._id,
      mockTest: testData.parentId,
      createdBy,
      createdAt: getFutureDateTime(),
    }));

    await UserAssignTest.insertMany(assignments);
    sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Method to get assigned test
exports.getAssignedTest = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { testId } = req.body;
    const query = {};
    query.testId = testId;

    const assignedTest = await UserAssignTest.find(query).populate([
      { path: "userId", select: "username" },
    ]);
    const result = assignedTest.map((user) => ({
      _id: user.userId._id,
      username: user.userId.username,
    }));
    sendResponse(res, 200, result, Messages.DATA_FOUND);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - Method to get assigned course and purchased course
exports.assignedCourses = async (req, res) => {
  try {
    const { userId } = req.body;
    const student = await UserProductDetails.find({ userId: userId }).populate([
      { path: "planId", select: "title" },
    ]);

    const formattedData = await Promise.all(
      student?.map(async (item) => {
        return {
          planId: item?.planId?._id ?? null,
          planName: item?.planId?.title ?? null,
        };
      })
    );
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {}
};

// SECTION - List students with isStudyAbroadApproved: true
exports.getStudyAbroadApprovedStudents = async (req, res) => {
  try {
    const staffId = req?.meta?._id;

    if (!mongoose.isValidObjectId(staffId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }
    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }

    const students = await Student.find({ isStudyAbroadApproved: true })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const formattedData = await Promise.all(
      students.map(async (student) => {
        const latestCounsellorAssignment = await PersonalCounsellor.findOne({
          studentId: student._id,
        })
          .sort({ assignedDate: -1 })
          .populate("counsellorId", "name")
          .lean();

        return {
          _id: student._id,
          username: student.username ?? null,
          isStudyAbroadApproved: student.isStudyAbroadApproved ?? false,
          createdAt: student.createdAt ?? null,
          updatedAt: student.updatedAt ?? null,
          counsellorId: latestCounsellorAssignment?.counsellorId?._id ?? null,
          counsellorName:
            latestCounsellorAssignment?.counsellorId?.name ?? null,
        };
      })
    );

    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION:  Update Study Abroad Approval Status  (Admin)
exports.updateStudyAbroadApprovalStatus = async (req, res) => {
  try {
    const staffId = req?.meta?._id;

    const { userId, isStudyAbroadApproved } = req.body;

    if (!userId || typeof isStudyAbroadApproved !== "boolean") {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELDS);
    }
    const staffExist = await Staff.findById(staffId);
    if (!staffExist) {
      return sendResponse(res, 400, null, Messages.STAFF_NOT_FOUND);
    }
    const user = await Student.findById(userId);
    if (!user) return sendResponse(res, 400, null, Messages.STUDENT_NOT_FOUND);

    await Student.findByIdAndUpdate(userId, {
      $set: {
        isStudyAbroadApproved,
        updatedBy: staffId,
        updatedAt: getCurrentISTTime(),
      },
    });

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: - Get Student Engagement Statuses (Student)
exports.getStudentStatuses = async (req, res) => {
  try {
    const studentId = req?.meta?._id;

    if (!studentId) {
      return sendResponse(res, 400, null, Messages.REQUIRED_FIELD("studentId"));
    }

    if (!mongoose.isValidObjectId(studentId)) {
      return sendResponse(res, 400, null, `STUDENT_ID ${Messages.INVALID_ID}`);
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return sendResponse(
        res,
        400,
        null,
        Messages.STUDENT_NOT_FOUND_BY_ID(studentId)
      );
    }

    const userProductDetail = await UserProductDetails.findOne({
      userId: student._id,
    });

    const response = {
      isStudyAbroadApproved: student.isStudyAbroadApproved ? true : false,
      isTestPrep: userProductDetail ? true : false,
      isImmersion: false,
      isInternationalEngagement: false,
    };

    sendResponse(res, 200, response, Messages.FETCHED_DATA);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION: Method to assign counsellor to student
exports.assignCounsellor = async (req, res) => {
  try {
    const { userId, counsellorId } = req.body;
    const adminId = req?.meta?._id;

    // Validate admin/staff
    const admin = await staffModel.findById(adminId);
    if (!admin) {
      return sendResponse(res, 403, null, "Unauthorized action");
    }

    // Validate student
    const student = await Student.findById(userId);
    if (!student) {
      return sendResponse(res, 404, null, "Student not found");
    }

    // Validate counsellor
    const counsellor = await staffModel.findById(counsellorId);
    if (!counsellor) {
      return sendResponse(res, 400, null, "Invalid counsellor ID");
    }

    // Assign
    const assignedAt = new Date();
    student.counsellorId = counsellorId;
    student.counsellorAssignedBy = adminId;
    student.counsellorAssignedAt = assignedAt;
    await student.save();

    // Prepare response
    const data = {
      userId: student._id,
      counsellorId: counsellor._id,
      counsellorName: counsellor.name,
      assignedAt: assignedAt.toISOString(),
    };

    return sendResponse(res, 200, data, "Counsellor assigned successfully");
  } catch (error) {
    console.error("AssignCounsellor Error:", error);
    return sendResponse(res, 500, null, error.message);
  }
};

// SECTIOM: Get Assigned Cousellor name

exports.getAssignedCounsellor = async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return sendResponse(res, 400, null, "Student ID is required");
    }

    // Fetch student and populate counsellor details
    const student = await Student.findById(studentId).populate({
      path: "counsellorId",
      select: "name",
    });

    if (!student) {
      return sendResponse(res, 404, null, "Student not found");
    }

    if (!student.counsellorId) {
      return sendResponse(res, 200, null, "Counsellor not assigned yet");
    }

    const data = {
      studentId: student._id,
      counsellorId: student.counsellorId._id,
      counsellorName: student.counsellorId.name,
    };

    return sendResponse(res, 200, data, "Counsellor fetched successfully");
  } catch (error) {
    console.error("getAssignedCounsellor Error:", error);
    return sendResponse(res, 500, null, error.message);
  }
};
