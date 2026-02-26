const MockTest = require("../model/mockTest");
const Class = require("../model/class");
const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const UserClass = require("../model/userClass");

const UserAttendance = require("../model/userAttendance");

const Batch = require("../model/batch");

//Section - get all plan for student
exports.studentPlan = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { year, month, batchId } = req.body;

    // ✅ Check batchId
    if (!batchId) {
      return sendResponse(
        res,
        200,
        [],
        "You are not assigned to any batch. Please contact your counselor or admin."
      );
    }

    // ✅ Find and validate batch
    const batch = await Batch.findOne({
      _id: batchId,
      students: userId,
    })
      .populate({
        path: "mockTests",
        populate: { path: "courseId", select: "title" },
      })
      .populate({
        path: "classes",
        match: {
          date: {
            $gte: new Date(`${year}-${month}-01`),
            $lte: new Date(`${year}-${month}-31`),
          },
        },
      });

    if (!batch) {
      return sendResponse(
        res,
        200,
        [],
        "You are not assigned to any batch. Please contact your counselor or admin."
      );
    }

    // ✅ Validate year & month
    if (
      !year ||
      !month ||
      !Number.isInteger(+year) ||
      !Number.isInteger(+month) ||
      month < 1 ||
      month > 12
    ) {
      return sendResponse(res, 400, null, "Invalid year or month");
    }

    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(`${year}-${month}-31`);

    // ✅ Filter mockTests based on courseId and date
    const mockTests = (batch.mockTests || []).filter(
      (mock) =>
        // purchasedPlanIds.includes(String(mock.courseId?._id)) &&
        mock.date >= startDate && mock.date <= endDate
    );

    // ✅ Fetch classes from batch.classes if populated
    const classes = batch.classes || [];
    // .filter((cls) =>
    //   purchasedPlanIds.includes(String(cls.courseId))
    // );

    // ✅ Combine and format
    const studentPlan = await Promise.all(
      [...classes, ...mockTests].map(async (item) => {
        const date = item.date.toISOString().slice(0, 10);
        let attendedClass = false;
        let notAttendedClass = false;

        if (item instanceof Class) {
          const userClass = await UserClass.findOne({
            userId,
            classId: item._id,
          });

          if (userClass) {
            attendedClass = userClass.isClassAttend === true;
            notAttendedClass = userClass.isClassAttend === false;
          }
        }

        return {
          date,
          mockTest: item instanceof MockTest,
          class: item instanceof Class,
          attendedClass,
          notAttendedClass,
        };
      })
    );

    const sortedPlan = studentPlan.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return sendResponse(res, 200, sortedPlan, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    return sendResponse(res, 400, null, error.message);
  }
};

// //Section - Get class details based on the date
exports.getClassAndMockTestDetails = async (req, res) => {
  try {
    const { batchId, date } = req.body;
    const userId = req.meta._id;

    // ✅ If no batchId is provided, send the custom message
    if (!batchId) {
      return sendResponse(
        res,
        200,
        null,
        "You are not assigned to batch, Please contact your counselor or admin"
      );
    }
    if (!date) {
      return sendResponse(res, 400, null, "Date are required");
    }

    const batch = await Batch.findById(batchId)
      .populate({
        path: "classes",
        populate: [
          { path: "courseId", select: "title" },
          { path: "learningId" },
          {
            path: "practiceId",
            populate: { path: "courseId", select: "title" },
          },
        ],
      })
      .populate({
        path: "mockTests",
        populate: { path: "courseId", select: "title" },
      })
      .populate("students");

    if (!batch) {
      return sendResponse(
        res,
        200,
        [],
        "No mock test assigned in this batch. Please contact your counselor or admin"
      );
    }

    const isStudentInBatch = batch.students?.some(
      (student) => student._id.toString() === userId.toString()
    );
    if (!isStudentInBatch) {
      return sendResponse(
        res,
        200,
        { class: [], mocktest: [] },
        "No data found"
      );
    }

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // ✅ Filter only by date (removed planId check)
    const mockTests = (batch.mockTests || []).filter(
      (mock) =>
        mock?.date &&
        new Date(mock.date) >= startDate &&
        new Date(mock.date) <= endDate
    );

    const classes = (batch.classes || []).filter(
      (cls) =>
        cls?.date &&
        new Date(cls.date) >= startDate &&
        new Date(cls.date) <= endDate
    );

    const formattedMockTests = mockTests.map((mock) => ({
      _id: mock._id,
      name: mock.name,
      date: mock.date,
      time: mock.time,
      courseId: mock?.courseId?._id || null,
      courseName: mock?.courseId?.title || null,
    }));

    const formattedClasses = await Promise.all(
      classes.map(async (cls) => {
        const attendance = await UserAttendance.findOne({
          userId,
          classId: cls._id,
        });

        return {
          _id: cls._id,
          name: cls.name,
          courseId: cls?.courseId?._id || cls?.courseId || null,
          courseName: cls?.courseId?.title || null,
          learningId: cls?.learningId?._id || null,
          learningBooklet: cls?.learningId?.booklet || [],
          duration: cls.duration,
          date: cls.date,
          meetingLink: cls.meetingLink,
          isAttend: attendance?.isAttend || false,
          practiceAssignment: cls.practiceId
            ? {
                _id: cls.practiceId._id,
                name: cls.practiceId.name,
                courseId:
                  cls.practiceId?.courseId?._id ||
                  cls.practiceId?.courseId ||
                  null,
              }
            : null,
        };
      })
    );

    const responseData = {
      date,
      class: formattedClasses || [],
      mocktest: formattedMockTests || [],
    };

    if (responseData.class.length === 0 && responseData.mocktest.length === 0) {
      return sendResponse(
        res,
        200,
        responseData,
        "No class or mock test found for this date."
      );
    }

    return sendResponse(res, 200, responseData, "Data retrieved successfully.");
  } catch (error) {
    console.error("getClassAndMockTestDetails error:", error);
    return sendResponse(res, 500, null, "Internal server error");
  }
};

//Section - Student join class
exports.classJoin = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { classId } = req.body;
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      sendResponse(res, 400, null, Messages.CLASS_NOT_FOUND);
    }
    const { courseId, date, duration, time } = classInfo;
    const originalTime = new Date().toISOString();

    // Extract the time section after the "T"
    const timeSection = originalTime.split("T")[1];

    // Create a Date object from the time section
    const timeDate = new Date(`1970-01-01T${timeSection}`);

    // Add 5 hours and 30 minutes to the time
    timeDate.setHours(timeDate.getHours() + 5);
    timeDate.setMinutes(timeDate.getMinutes() + 30);

    // Format the adjusted time as desired
    const adjustedTime = timeDate.toISOString().split("T")[1];
    const formattedClassDate = new Date(date).toLocaleDateString();
    await UserClass.create({
      userId,
      courseId,
      classId,
      classDate: formattedClassDate,
      joinTime: adjustedTime,
      // isClassAttend: true,
      classDuration: duration,
      classTime: time,
    });
    sendResponse(res, 200, null, Messages.CLASS_JOINED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
