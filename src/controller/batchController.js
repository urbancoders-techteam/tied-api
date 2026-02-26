const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const Batch = require("../model/batch");
const Plan = require("../model/plan");
const Class = require("../model/class");
const studentModel = require("../model/studentModel");
const testModel = require("../model/test");
const mockTestModel = require("../model/mockTest");

// SECTION: Create Batch
exports.createBatch = async (req, res) => {
  try {
    const { name, planId } = req.body;

    if (!name) return sendResponse(res, 400, null, "Batch name is required");
    if (!planId) return sendResponse(res, 400, null, "plan ID is required");

    // ✅ Check for duplicate name under same plan (case-insensitive)
    const duplicate = await Batch.findOne({
      planId,
      name: { $regex: `^${name}$`, $options: "i" },
    });
    if (duplicate) {
      return sendResponse(res, 400, null, Messages.SAME_BATCH);
    }

    // ✅ Check if plan/plan exists
    const planExists = await Plan.findById(planId); // or plan.findById()
    if (!planExists) {
      return sendResponse(res, 404, null, "plan/Plan not found");
    }

    // ✅ Create the batch
    await Batch.create({
      name,
      planId,
      createdBy: req.meta?._id || null,
    });

    return sendResponse(res, 200, null, Messages.DATA_CREATED);
  } catch (error) {
    console.error("Error:", error);
    return sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Get All Batches
exports.listBatch = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    // Prevent blank search returning all results
    const searchText = search.trim();

    const query =
      searchText.length > 0
        ? {
            name: { $regex: searchText, $options: "i" } ,
          }
        : {};

    const [count, batches] = await Promise.all([
      Batch.countDocuments(query),
      Batch.find(query)
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .populate("planId", "title name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
    ]);

    const totalPage = Math.ceil(count / parsedLimit);

    sendResponse(
      res,
      200,
      {
        count,
        totalPage,
        currentPage: parseInt(page),
        batches,
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    console.error("Error retrieving batches:", error);
    sendResponse(res, 500, null, error.message || "Error retrieving batches");
  }
};

// SECTION: Get Batch by ID
exports.getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findById(id).populate([
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
      { path: "planId", select: "title name" },
    ]);

    if (!batch) return sendResponse(res, 404, null, "Batch not found");

    sendResponse(res, 200, batch, Messages.DATA_RETRIVED);
  } catch (error) {
    console.log(error);
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Update Batch
exports.updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, planId } = req.body;

    if (!name) return sendResponse(res, 400, null, "Batch name is required");
    if (!planId) return sendResponse(res, 400, null, "plan ID is required");

    // Check for existing batch with same name (case-insensitive) under the same plan, excluding current batch
    const duplicate = await Batch.findOne({
      _id: { $ne: id },
      planId: planId,
      name: name,
    });

    if (duplicate) return sendResponse(res, 400, null, Messages.SAME_BATCH);

    // ✅ Validate plan exists
    const planExists = await Plan.findById(planId);
    if (!planExists) return sendResponse(res, 404, null, "plan not found");

    const updated = await Batch.findByIdAndUpdate(
      id,
      {
        name,
        planId,
        updatedBy: req.meta?._id || null,
      },
      { new: true }
    );

    if (!updated) return sendResponse(res, 404, null, "Batch not found");

    sendResponse(res, 200, updated, Messages.DATA_UPDATE);
  } catch (error) {
    console.error("Update Batch Error:", error);
    sendResponse(res, 400, null, error.message);
  }
};

// Simplified version for direct batch reference
exports.orderListAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { "plans.planName": { $regex: search, $options: "i" } },
        { "batch.name": { $regex: search, $options: "i" } } // Direct batch reference
      ];
    }

    const count = await Order.countDocuments(query);

    const listOrder = await Order.find(query)
      .populate({
        path: "createdBy",
        model: "Student",
        select: "username email",
      })
      .populate({
        path: "batch",
        model: "Batch",
        select: "name",
      })
      .populate({
        path: "plan",
        model: "Plan",
        select: "planName",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const result = listOrder.map((item) => ({
      _id: item?._id,
      orderId: item?.orderId,
      dateOfPurchase: item?.dateOfPurchase,
      amount: item?.amount,
      paymentStatus: item?.paymentStatus,
      planName: item?.plan?.planName || "N/A",
      batchName: item?.batch?.name || "N/A",
      createdBy: item?.createdBy?.username,
      email: item?.createdBy?.email,
    }));

    sendResponse(res, 200, {
      listOrder: result,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      totalItems: count,
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Admin Order List Error:", error);
    return sendResponse(res, 500, null, Messages.INTERNAL_ISSUE);
  }
};

// SECTION: Delete Batch
exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Batch.findByIdAndDelete(id);

    if (!deleted) return sendResponse(res, 404, null, "Batch not found");

    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: Assign or Unassign Students to/from Batch
exports.modifyStudentsInBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { students, type } = req.body;

    if (!["assign", "unassign"].includes(type)) {
      return sendResponse(
        res,
        400,
        null,
        "Invalid type. Use 'assign' or 'unassign'."
      );
    }

    if (!Array.isArray(students) || students.length === 0) {
      return sendResponse(res, 400, null, "Students array is required");
    }

    const batch = await Batch.findById(id);
    if (!batch) return sendResponse(res, 404, null, "Batch not found");

    const foundStudents = await studentModel.find({ _id: { $in: students } });
    if (foundStudents.length !== students.length) {
      return sendResponse(res, 400, null, "Some student IDs are invalid");
    }

    if (type === "assign") {
      const alreadyAssigned = batch.students.map((s) => s.toString());
      const newStudentIds = students.filter(
        (stuId) => !alreadyAssigned.includes(stuId)
      );

      if (newStudentIds.length === 0) {
        return sendResponse(
          res,
          200,
          null,
          "All students are already assigned"
        );
      }

      await Batch.findByIdAndUpdate(
        id,
        { $addToSet: { students: { $each: newStudentIds } } },
        { new: true }
      );

      const partial = newStudentIds.length < students.length;
      return sendResponse(
        res,
        200,
        null,
        partial
          ? "Some students were already assigned. New students assigned successfully"
          : "Students assigned successfully"
      );
    }

    if (type === "unassign") {
      await Batch.findByIdAndUpdate(
        id,
        { $pull: { students: { $in: students } } },
        { new: true }
      );

      return sendResponse(res, 200, null, "Students unassigned successfully");
    }
  } catch (error) {
    console.error("Modify Students Error:", error);
    sendResponse(res, 500, null, error.message);
  }
};

// SECTION: Assign or Unassign class to/from Batch
exports.modifyClassesInBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { classes, type, planId } = req.body;

    if (!["assign", "unassign"].includes(type)) {
      return sendResponse(
        res,
        400,
        null,
        "Invalid type. Use 'assign' or 'unassign'."
      );
    }

    if (!Array.isArray(classes) || classes.length === 0) {
      return sendResponse(res, 400, null, "Classes array is required");
    }

    if (!planId) {
      return sendResponse(res, 400, null, "Plan ID is required");
    }
    const plan = await Plan.findById({ _id: planId });
    if (!plan) return sendResponse(res, 404, null, "Plan not found");

    const batch = await Batch.findById(id);
    if (!batch) return sendResponse(res, 404, null, "Batch not found");

    const foundClasses = await Class.find({ _id: { $in: classes } });

    if (foundClasses.length !== classes.length) {
      return sendResponse(res, 400, null, "Some class IDs are invalid");
    }

    if (type === "assign") {
      const alreadyAssigned = batch.classes.map((c) => c.toString());

      const newClassIds = classes.filter(
        (classId) => !alreadyAssigned.includes(classId)
      );

      if (newClassIds.length === 0) {
        return sendResponse(res, 200, null, "Class already assigned");
      }

      await Batch.findByIdAndUpdate(
        id,
        { $addToSet: { classes: { $each: newClassIds } } },
        { new: true }
      );

      const partial = newClassIds.length < classes.length;
      return sendResponse(
        res,
        200,
        null,
        partial
          ? "Some classes were already assigned. Remaining assigned successfully"
          : "Classes assigned successfully"
      );
    }

    if (type === "unassign") {
      await Batch.findByIdAndUpdate(
        id,
        {
          $pull: {
            classes: { $in: classes },
          },
        },
        { new: true }
      );

      return sendResponse(res, 200, null, "Classes unassigned successfully");
    }
  } catch (error) {
    console.error("Modify Classes Error:", error);
    sendResponse(res, 500, null, error.message);
  }
};

// SECTION: Assign or Unassign mock tests to/from Batch
exports.modifyMockTestsInBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { mockTests, type, planId } = req.body;

    if (!["assign", "unassign"].includes(type)) {
      return sendResponse(
        res,
        400,
        null,
        "Invalid type. Use 'assign' or 'unassign'."
      );
    }

    if (!Array.isArray(mockTests) || mockTests.length === 0) {
      return sendResponse(res, 400, null, "mockTests array is required");
    }

    if (!planId) {
      return sendResponse(res, 400, null, "Plan ID is required");
    }

    const plan = await Plan.findById(planId);
    if (!plan) return sendResponse(res, 404, null, "Plan not found");

    const batch = await Batch.findById(id);
    if (!batch) return sendResponse(res, 404, null, "Batch not found");

    const foundMockTests = await mockTestModel.find({
      _id: { $in: mockTests },
    });

    if (foundMockTests.length !== mockTests.length) {
      return sendResponse(res, 400, null, "Some mock test IDs are invalid");
    }

    if (type === "assign") {
      const alreadyAssigned = batch.mockTests.map((mt) => mt.toString());

      const newMockTestIds = mockTests.filter(
        (mtId) => !alreadyAssigned.includes(mtId)
      );

      if (newMockTestIds.length === 0) {
        return sendResponse(res, 200, null, "Mock tests already assigned");
      }

      await Batch.findByIdAndUpdate(
        id,
        { $addToSet: { mockTests: { $each: newMockTestIds } } },
        { new: true }
      );

      const partial = newMockTestIds.length < mockTests.length;
      return sendResponse(
        res,
        200,
        null,
        partial
          ? "Some mock tests were already assigned. Remaining assigned successfully"
          : "Mock tests assigned successfully"
      );
    }

    if (type === "unassign") {
      await Batch.findByIdAndUpdate(
        id,
        { $pull: { mockTests: { $in: mockTests } } },
        { new: true }
      );

      return sendResponse(res, 200, null, "Mock tests unassigned successfully");
    }
  } catch (error) {
    console.error("Modify MockTests Error:", error);
    sendResponse(res, 500, null, error.message);
  }
};

// SECTION: Get Batches by Plan ID & Return Only If Student Is Assigned
exports.getBatchesByStudentAndPlan = async (req, res) => {
  try {
    const { studentId, planId } = req.params;

    if (!studentId || !planId) {
      return sendResponse(
        res,
        400,
        null,
        "Student ID and Plan ID are required"
      );
    }

    // Check if student exists
    const studentExists = await studentModel.findById(studentId);
    if (!studentExists) {
      return sendResponse(res, 404, null, "Student not found");
    }

    // Find all batches under the given planId where student is assigned
    const assignedBatches = await Batch.find({
      planId,
      students: studentId,
    }).select("name _id");

    if (assignedBatches.length === 0) {
      return sendResponse(
        res,
        404,
        {
          count: 0,
          studentAssigned: false,
          batchList: [],
        },
        "You are not assigned to any batch under this plan. Please contact your counsellor or admin."
      );
    }

    const batchList = assignedBatches.map((batch) => ({
      id: batch._id,
      name: batch.name,
      isStudentAssigned: true,
    }));

    return sendResponse(
      res,
      200,
      {
        count: batchList.length,
        studentAssigned: true,
        batchList,
      },
      "Batches retrieved. Student is assigned to one or more batches."
    );
  } catch (error) {
    console.error("Get Batches by Student & Plan Error:", error);
    return sendResponse(res, 500, null, error.message);
  }
};
