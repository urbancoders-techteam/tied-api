const LearningResource = require("../model/learningResources");
const { Messages } = require("../helper/message");
const Plan = require("../model/plan");
const { sendResponse } = require("../helper/response");
const { uploadToS3 } = require("../helper/uploadToS3");
const UserProductDetails = require("../model/userProductDetail");
const { planByType } = require("./service");

//Section - Create Learning Resources
exports.addLearningResources = async (req, res) => {
  try {
    const { name, courseId, date, booklet } = req.body;
    const checkPlan = await Plan.findById(courseId);
    if (!checkPlan)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    const uploadedBooklets = await Promise.all(
      booklet.map(async (ele) => {
        const pdfUrl = await uploadToS3(ele.pdf, "pdf");

        return {
          name: ele.name,
          pdf: pdfUrl,
        };
      })
    );
    const learningResources = await LearningResource.create({
      name,
      courseId,
      date,
      booklet: uploadedBooklets,
      createdBy: req?.meta?._id,
    });
    sendResponse(res, 200, learningResources, Messages.DATA_CREATED);
  } catch (error) {
    console.log(error);
    sendResponse(res, 400, null, error.messages);
  }
};

//Section - List Learning Resources
exports.listLearningResources = async (req, res) => {
  try {
    const { page, limit, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const plans = await planByType(type);
    const count = await LearningResource.countDocuments({
      courseId: { $in: plans },
    });
    const learningResources = await LearningResource.find({
      courseId: { $in: plans },
    })
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
        { path: "courseId", select: "title" },
      ])
      .skip(skip)
      .limit(parsedLimit)
      .sort({ createdAt: -1 })
      .exec();

    const formattedData = learningResources.map((item) => ({
      _id: item?._id,
      courseId: item?.courseId?._id ?? null,
      courseName: item?.courseId?.title ?? null,
      name: item?.name ?? null,
      date: item?.date ?? null,
      booklet: item?.booklet?.map((ele) => ({
        _id: ele?._id,
        name: ele?.name ?? null,
        pdf: ele?.pdf ?? null,
      })),
      createdBy: item?.createdBy ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
    }));
    sendResponse(res, 200, { count, formattedData }, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Get Learning Resources
exports.getLearningResources = async (req, res) => {
  try {
    const { id } = req.params;
    const learningResources = await LearningResource.findById(id).populate([
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
      { path: "courseId", select: "title" },
    ]);
    if (!learningResources) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    // const formattedData = learningResources.map(item => ({
    //     _id: item?._id,
    //     courseId: item?.courseId ?? null,
    //     courseName: item?.courseId?.title ?? null,
    //     name: item?.name ?? null,
    //     date: item?.date ?? null,
    //     booklet: item?.booklet?.map(ele => ({
    //         _id: ele?._id,
    //         name: ele?.name ?? null,
    //         pdf: ele?.pdf ?? null,
    //     })),
    //     createdBy: item?.createdBy?.name ?? null,
    //     updatedBy: item?.updatedBy?.name ?? null,
    // }))
    sendResponse(res, 200, learningResources, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Update Learning Resources
exports.updateLearningResources = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the resource by ID
    const data = await LearningResource.findById(id);
    if (!data) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }

    const { name, courseId, date, booklet } = req.body;

    // Check if the course exists
    const checkPlan = await Plan.findById(courseId);
    if (!checkPlan)
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

    // Check for booklet and handle base64 PDF logic
    let updateFields = {
      name,
      courseId,
      date,
      updatedBy: req?.meta?._id,
    };

    if (booklet && booklet.length > 0) {
      const base64PdfRegex = /^data:application\/pdf;base64,/;

      // Check if the pdf field in any of the booklet entries is base64-encoded
      const isBase64Pdf = booklet.some((ele) => base64PdfRegex.test(ele.pdf));

      if (isBase64Pdf) {
        // Process the base64 PDFs and upload them to S3
        const uploadedBooklets = await Promise.all(
          booklet.map(async (ele) => {
            let pdfUrl = ele.pdf;

            if (base64PdfRegex.test(ele.pdf)) {
              // Upload to S3 if the pdf is base64
              pdfUrl = await uploadToS3(ele.pdf, "pdf");
            }

            return {
              name: ele.name,
              pdf: pdfUrl,
            };
          })
        );

        // Add the updated booklet array to the fields to be updated
        updateFields.booklet = uploadedBooklets;
      }
    }

    // Update the resource with the updated fields
    const updatedLearningResource = await LearningResource.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true } // Return the updated document
    );

    // Send the response with the updated data
    sendResponse(res, 200, updatedLearningResource, Messages.DATA_UPDATE);
  } catch (error) {
    console.log("Error in updateLearningResources:", error);
    sendResponse(
      res,
      400,
      null,
      error.message || "An error occurred during the update"
    );
  }
};

//Section - Delete Learning Resources
exports.deleteLearningResources = async (req, res) => {
  try {
    const { id } = req.params;
    const learningResources = await LearningResource.findByIdAndDelete(id);
    if (!learningResources) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - List
exports.list = async (req, res) => {
  try {
    const { type } = req.query;
    let plans;
    let filter = {};
    if (type) {
      plans = await planByType(type);
      filter = {
        courseId: { $in: plans },
      };
    }
    const learningResources = await LearningResource.find(filter)
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
        { path: "courseId", select: "title" },
      ])
      .sort({ createdAt: -1 });

    const formattedData = learningResources.map((item) => ({
      _id: item?._id,
      courseId: item?.courseId?._id ?? null,
      courseName: item?.courseId?.title ?? null,
      name: item?.name ?? null,
      date: item?.date ?? null,
      booklet: item?.booklet?.map((ele) => ({
        _id: ele?._id,
        name: ele?.name ?? null,
        pdf: ele?.pdf ?? null,
      })),
      createdBy: item?.createdBy?.name ?? null,
      updatedBy: item?.updatedBy?.name ?? null,
    }));
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Get Learing Resource based on user purchase
exports.LearningResourceWeb = async (req, res) => {
  try {
    const {
      // page, limit,
      planId,
    } = req.query;
    // const skip = (parseInt(page) - 1) * parseInt(limit);
    // const parsedLimit = parseInt(limit);
    const userId = req?.meta?._id;
    const filter = {
      userId,
      status: true,
    };
    if (planId) {
      filter.planId = planId;
    }
    // Fetch the plans purchased by the user
    const userProducts = await UserProductDetails.find(filter)
      .select("planId")
      .lean();

    if (!userProducts.length) {
      return sendResponse(
        res,
        400,
        [],
        "No purchased plans found for this user."
      );
    }

    // Extract the plan IDs from the userProduct details
    const purchasedPlanIds = userProducts.map((product) => product.planId);

    // Fetch the mock tests that match the purchased plans
    const mockTests = await LearningResource.find({
      courseId: { $in: purchasedPlanIds },
    })
      // .skip(skip)
      // .limit(parsedLimit)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!mockTests.length) {
      return sendResponse(
        res,
        404,
        [],
        "No mock tests found for the purchased plans."
      );
    }

    // Format the data if necessary
    const formattedData = mockTests.map((item) => ({
      _id: item._id,
      name: item.name ?? null,
      date: item.date ?? null,
      courseId: item.courseId ?? null,
      pdf:
        item.booklet?.map((ele) => ({
          name: ele?.name ?? null,
          pdf: ele?.pdf ?? null,
        })) ?? [],
    }));

    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};
