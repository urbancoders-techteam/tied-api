const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const Order = require("../model/order");
const Student = require("../model/studentModel");
const Staff = require("../model/staffModel");
const MockTest = require("../model/mockTest");
const UserProductDetails = require("../model/userProductDetail");

exports.Dashboard = async (req, res) => {
  try {
    const totalOrder = await Order.countDocuments();
    const totalStudent = await Student.countDocuments();
    const totalStaff = await Staff.countDocuments();

    const formattedData = {
      totalOrder,
      totalStudent,
      totalStaff,
    };

    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION - Latest Exam Date

exports.LatestExamDate = async (req, res) => {
  try {
    const userId = req?.meta?._id; // Get user ID from request metadata
    const { planId } = req.query; // Get planId from query parameters

    const filter = { userId };
    if (planId) filter.planId = planId;

    // Fetch user-purchased plans
    const userPurchasedPlans = await UserProductDetails.find(filter).select("planId userId");

    if (userPurchasedPlans.length === 0) {
      return sendResponse(res, 200, null, "No plans purchased");
    }

    const purchasedPlanIds = userPurchasedPlans.map((plan) => plan.planId);

    // Fetch the latest exam dates from the MockTest collection based on planId
    const latestExamDates = await MockTest.find({
      courseId: { $in: purchasedPlanIds },
    })
      .sort({ date: -1 }) // Sort by date in descending order
      .limit(1) // Get the latest exam date
      .select("date title courseId") // Select date, title, and courseId (planId)
      .lean();

    if (latestExamDates.length === 0) {
      return sendResponse(res, 200, null, "No exams found for the selected plan");
    }

    // Map the data to include userId, planId (courseId), and date
    const formattedData = latestExamDates.map((exam) => ({
      date: exam.date,
      userId: userId, // Include the userId from the request metadata
      planId: exam.courseId, // Include the planId (courseId from MockTest)
      title: exam.title, // Include the exam title
    }));

    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};
