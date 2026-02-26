const mongoose = require("mongoose");
const Test = require("../model/test");
const MockTest = require("../model/mockTest");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const {
  uploadToS3,
  getSignedUrlImage,
  uploadFileToS3,
  getSignedUrl,
} = require("../helper/uploadToS3");
const LearningResource = require("../model/learningResources");
const PracticeAssignment = require("../model/practiceAssignment");
const UserTest = require("../model/userTest");
const UserPractice = require("../model/userPractice");
const Plan = require("../model/plan");
const UserProductDetails = require("../model/userProductDetail");
const UserAttendance = require("../model/userAttendance");
const staffModel = require("../model/staffModel");
const Batch = require("../model/batch");
const studentModel = require("../model/studentModel");
/*------------------------- Admin Section --------------------------*/

//Section - Create test
exports.createTest = async (req, res) => {
  try {
    const {
      testType,
      parentId,
      name,
      types,
      reading,
      writing,
      speaking,
      listening,
      aptitude,
      question,
      marks,
      duration,
    } = req.body;

    const uploadTestData = async (data = []) => {
      return await Promise.all(
        data.map(async (ele, index) => {
          try {
            if (
              !ele?.pdf ||
              typeof ele.pdf !== "string" ||
              !ele.pdf.startsWith("data:application/pdf;base64,")
            ) {
              return {
                name: ele?.name,
                pdf: null,
                isUploadFiles: ele?.isUploadFiles,
                audio: ele?.audio,
                numberOfWord: ele?.numberOfWord,
              };
            }

            const pdfUrl = await uploadToS3(ele.pdf, "pdf");
            return {
              name: ele?.name,
              pdf: pdfUrl,
              isUploadFiles: ele?.isUploadFiles,
              audio: ele?.audio,
              numberOfWord: ele?.numberOfWord,
            };
          } catch (err) {
            console.error(
              `🚨 PDF Upload Error at index ${index}:`,
              err.message
            );
            throw err; // So controller still handles it properly
          }
        })
      );
    };

    const testData = {
      testType: testType,
      parentId,
      name,
      types,
      totalQuestion: question,
      totalMarks: marks,
      duration,
      createdBy: req?.meta?._id,
    };

    if (writing) {
      // testData.writing = await uploadTestData(writing || []);
      testData.writing = {
        individualQuestions: writing.individualQuestions,
        duration: writing.duration,
        marks: writing.marks,
        data: await uploadTestData(writing?.data || []),
      };
    }
    if (speaking) {
      testData.speaking = {
        individualQuestions: speaking.individualQuestions,
        duration: speaking.duration,
        marks: speaking.marks,
        data: await uploadTestData(speaking?.data || []),
      };
    }

    if (reading) {
      // testData.reading = await uploadTestData(reading || []);
      testData.reading = {
        individualQuestions: reading.individualQuestions,
        duration: reading.duration,
        marks: reading.marks,
        question: reading.question,
        data: await uploadTestData(reading?.data || []),
      };
    }

    if (listening) {
      // testData.listening = await uploadTestData(listening || []);
      testData.listening = {
        individualQuestions: listening.individualQuestions,
        duration: listening.duration,
        marks: listening.marks,
        question: listening.question,
        data: await uploadTestData(listening?.data || []),
      };
    }

    if (aptitude) {
      // testData.aptitude = await uploadTestData(aptitude || []);
      testData.aptitude = {
        individualQuestions: aptitude.individualQuestions,
        duration: aptitude.duration,
        marks: aptitude.marks,
        question: aptitude.question,
        data: await uploadTestData(aptitude?.data || []),
      };
    }

    const staffExists = await staffModel.findById(req.meta._id);
    if (!staffExists) {
      return sendResponse(res, 400, null, "Invalid Staff ID");
    }

    const test = await Test.create(testData);
    sendResponse(res, 200, test, Messages.DATA_CREATED);
  } catch (error) {
    console.error("❌ Upload Error:", error);
    sendResponse(res, 500, null, error.message);
  }
};

//Section - List Test
exports.listTest = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);
    const count = await Test.countDocuments();
    const tests = await Test.find()
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .skip(skip)
      .limit(parsedLimit)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const formattedData = await Promise.all(
      tests.map(async (item) => {
        // Determine the appropriate parent population based on the tests field
        let parentData = null;
        if (item.testType === "MockTest") {
          parentData = await MockTest.findById(item.parentId)
            .select("name")
            .lean()
            .exec();
        } else if (item.testType === "PracticeAssignment") {
          parentData = await PracticeAssignment.findById(item.parentId)
            .select("name")
            .lean()
            .exec();
        }

        return {
          _id: item?._id,
          name: item?.name ?? null,
          testType: item?.testType ?? null,
          parentId: item?.parentId ?? null,
          parentName: parentData?.name ?? null,
          types: item?.types ?? [],

          // Reading Section
          reading: item?.reading
            ? [
                {
                  individualQuestions:
                    item?.reading?.individualQuestions ?? null,
                  duration: item?.reading?.duration ?? null,
                  marks: item?.reading?.marks ?? null,
                  question:
                    item?.reading?.question?.map((q) => ({
                      _id: q?._id ?? null,
                      questionNumber: q?.questionNumber ?? null,
                      type: q?.type ?? null,
                    })) ?? [],
                  data:
                    item?.reading?.data?.map((d) => ({
                      _id: d?._id ?? null,
                      name: d?.name ?? null,
                      pdf: d?.pdf ?? null,
                      audio: d?.audio ?? null,
                      numberOfWord: d?.numberOfWord ?? null,
                    })) ?? [],
                },
              ]
            : [],

          // Speaking Section
          speaking: item?.speaking
            ? [
                {
                  individualQuestions:
                    item?.speaking?.individualQuestions ?? null,
                  duration: item?.speaking?.duration ?? null,
                  marks: item?.speaking?.marks ?? null,
                  data:
                    item?.speaking?.data?.map((s) => ({
                      _id: s?._id ?? null,
                      name: s?.name ?? null,
                      pdf: s?.pdf ?? null,
                    })) ?? [],
                },
              ]
            : [],

          // Writing Section
          writing: item?.writing
            ? [
                {
                  individualQuestions:
                    item?.writing?.individualQuestions ?? null,
                  duration: item?.writing?.duration ?? null,
                  marks: item?.writing?.marks ?? null,
                  data:
                    item?.writing?.data?.map((d) => ({
                      _id: d?._id ?? null,
                      name: d?.name ?? null,
                      pdf: d?.pdf ?? null,
                      audio: d?.audio ?? null,
                      numberOfWord: d?.numberOfWord ?? null,
                    })) ?? [],
                },
              ]
            : [],

          // Listening Section
          listening: item?.listening
            ? [
                {
                  individualQuestions:
                    item?.listening?.individualQuestions ?? null,
                  duration: item?.listening?.duration ?? null,
                  marks: item?.listening?.marks ?? null,
                  question:
                    item?.listening?.question?.map((q) => ({
                      _id: q?._id ?? null,
                      questionNumber: q?.questionNumber ?? null,
                      type: q?.type ?? null,
                    })) ?? [],
                  data:
                    item?.listening?.data?.map((d) => ({
                      _id: d?._id ?? null,
                      name: d?.name ?? null,
                      pdf: d?.pdf ?? null,
                      audio: d?.audio ?? null,
                      numberOfWord: d?.numberOfWord ?? null,
                    })) ?? [],
                },
              ]
            : [],

          // Aptitude Section
          aptitude: item?.aptitude
            ? [
                {
                  individualQuestions:
                    item?.aptitude?.individualQuestions ?? null,
                  duration: item?.aptitude?.duration ?? null,
                  marks: item?.aptitude?.marks ?? null,
                  question:
                    item?.aptitude?.question?.map((q) => ({
                      _id: q?._id ?? null,
                      questionNumber: q?.questionNumber ?? null,
                      type: q?.type ?? null,
                    })) ?? [],
                  data:
                    item?.aptitude?.data?.map((d) => ({
                      _id: d?._id ?? null,
                      name: d?.name ?? null,
                      pdf: d?.pdf ?? null,
                      audio: d?.audio ?? null,
                      numberOfWord: d?.numberOfWord ?? null,
                    })) ?? [],
                },
              ]
            : [],

          // General Fields
          totalQuestion: item?.totalQuestion ?? null,
          totalMarks: item?.totalMarks ?? null,
          duration: item?.duration ?? null,
          createdBy: item?.createdBy ?? null,
          updatedBy: item?.updatedBy ?? null,
        };
      })
    );

    sendResponse(res, 200, { count, formattedData }, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};

// SECTION: Get All Tests - Only ID and Name
exports.listTestWithoutPagination = async (req, res) => {
  try {
    const tests = await Test.find({}, { _id: 1, name: 1 }).sort({ name: 1 });

    const formattedData = tests.map((test) => ({
      _id: test._id,
      name: test.name ?? null,
    }));

    sendResponse(res, 200, formattedData, "Tests fetched successfully");
  } catch (error) {
    console.error("Error fetching test list:", error);
    sendResponse(res, 500, null, error.message || "Internal server error");
  }
};

//Section - Get Test
exports.getTest = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the test by its ID and populate necessary fields
    const test = await Test.findById(id)
      .populate([
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .select(
        "testType parentId totalQuestion totalMarks duration name types reading writing speaking listening aptitude"
      );

    if (!test) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    let parentName;
    // Check the test type and fetch parent data from the correct model
    if (test.testType === "MockTest") {
      parentName = await MockTest.findById(test?.parentId).select("name");
    } else if (test.testType === "PracticeAssignment") {
      parentName = await PracticeAssignment.findById(test?.parentId).select(
        "name"
      );
    }
    if (!parentName) {
      return sendResponse(res, 400, null, "Parent data not found");
    }
    const formatted = {
      _id: test._id,
      testType: test.testType,
      parentId: test.parentId,
      parentName: parentName.name, // Adding the parent name to the response
      name: test.name,
      question: test.totalQuestion,
      marks: test.totalMarks,
      duration: test.duration,
      types: test.types ?? [],

      // Formatting reading section
      reading: test.reading
        ? {
            individualQuestions: test.reading.individualQuestions ?? null,
            duration: test.reading.duration ?? null,
            marks: test.reading.marks ?? null,
            question:
              test.reading.question?.map((q) => ({
                _id: q?._id ?? null,
                questionNumber: q?.questionNumber ?? null,
                type: q?.type ?? null,
              })) ?? [],
            data:
              test.reading.data?.map((d) => ({
                _id: d?._id ?? null,
                name: d?.name ?? null,
                pdf: d?.pdf ?? null,
                audio: d?.audio ?? null,
                numberOfWord: d?.numberOfWord ?? null,
                isUploadFiles: d?.isUploadFiles ?? false,
              })) ?? [],
          }
        : null,

      // Formatting writing section
      writing: test.writing
        ? {
            individualQuestions: test.writing.individualQuestions ?? null,
            duration: test.writing.duration ?? null,
            marks: test.writing.marks ?? null,
            data:
              test?.writing?.data?.map((d) => ({
                _id: d?._id ?? null,
                name: d?.name ?? null,
                pdf: d?.pdf ?? null,
                audio: d?.audio ?? null,
                numberOfWord: d?.numberOfWord ?? null,
                isUploadFiles: d?.isUploadFiles ?? false,
              })) ?? [],
          }
        : null,

      // // Formatting speaking section
      // speaking: test.speaking ?? [],

      // Formatting speaking section
      speaking: test.speaking
        ? {
            individualQuestions: test.speaking.individualQuestions ?? null,
            duration: test.speaking.duration ?? null,
            marks: test.speaking.marks ?? null,
            data:
              test?.speaking?.data?.map((d) => ({
                _id: d?._id ?? null,
                name: d?.name ?? null,
                pdf: d?.pdf ?? null,
                audio: d?.audio ?? null,
                numberOfWord: d?.numberOfWord ?? null,
                isUploadFiles: d?.isUploadFiles ?? false,
              })) ?? [],
          }
        : null,

      // Formatting listening section
      listening: test.listening
        ? {
            individualQuestions: test.listening.individualQuestions ?? null,
            duration: test.listening.duration ?? null,
            marks: test.listening.marks ?? null,
            question:
              test.listening.question?.map((q) => ({
                _id: q?._id ?? null,
                questionNumber: q?.questionNumber ?? null,
                type: q?.type ?? null,
              })) ?? [],
            data:
              test.listening.data?.map((d) => ({
                _id: d?._id ?? null,
                name: d?.name ?? null,
                pdf: d?.pdf ?? null,
                audio: d?.audio ?? null,
                numberOfWord: d?.numberOfWord ?? null,
                isUploadFiles: d?.isUploadFiles ?? false,
              })) ?? [],
          }
        : null,

      // Formatting aptitude section
      aptitude: test.aptitude
        ? {
            individualQuestions: test.aptitude.individualQuestions ?? null,
            duration: test.aptitude.duration ?? null,
            marks: test.aptitude.marks ?? null,
            question:
              test.aptitude.question?.map((q) => ({
                _id: q?._id ?? null,
                questionNumber: q?.questionNumber ?? null,
                type: q?.type ?? null,
              })) ?? [],
            data:
              test.aptitude.data?.map((d) => ({
                _id: d?._id ?? null,
                name: d?.name ?? null,
                pdf: d?.pdf ?? null,
                audio: d?.audio ?? null,
                numberOfWord: d?.numberOfWord ?? null,
                isUploadFiles: d?.isUploadFiles ?? false,
              })) ?? [],
          }
        : null,
    };

    sendResponse(res, 200, formatted, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Update Test
exports.updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await Test.findById(id);
    if (!check) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    const {
      testType,
      parentId,
      name,
      types,
      reading,
      writing,
      speaking,
      listening,
      aptitude,
      question,
      marks,
      duration,
    } = req.body;

    const uploadTestData = async (data = []) => {
      return await Promise.all(
        data.map(async (ele) => {
          const base64PdfRegex = /^data:application\/pdf;base64,/;
          let pdfUrl = null; // Initialize pdfUrl

          // Check if the current element's PDF is base64
          if (base64PdfRegex.test(ele.pdf)) {
            pdfUrl = await uploadToS3(ele.pdf, "pdf"); // Upload if it is base64
          } else {
            pdfUrl = ele.pdf; // Use the existing PDF URL if not base64
          }

          // Return the object with the possibly updated PDF URL
          return {
            name: ele.name,
            pdf: pdfUrl,
            isUploadFiles: ele?.isUploadFiles,
            audio: ele.audio, // Make sure audio is defined
            numberOfWord: ele?.numberOfWord,
          };
        })
      );
    };
    const testData = {
      testType: testType,
      parentId,
      name,
      types,
      totalQuestion: question,
      totalMarks: marks,
      duration,
      updatedBy: req?.meta?._id,
    };
    if (writing) {
      // testData.writing = await uploadTestData(writing || []);
      testData.writing = {
        individualQuestions: writing.individualQuestions,
        duration: writing.duration,
        marks: writing.marks,
        data: await uploadTestData(writing?.data || []),
      };
    }
    if (speaking) {
      testData.speaking = {
        individualQuestions: speaking.individualQuestions,
        duration: speaking.duration,
        marks: speaking.marks,
        data: await uploadTestData(speaking?.data || []),
      };
    }

    if (reading) {
      // testData.reading = await uploadTestData(reading || []);
      testData.reading = {
        individualQuestions: reading.individualQuestions,
        duration: reading.duration,
        marks: reading.marks,
        question: reading.question,
        data: await uploadTestData(reading?.data || []),
      };
    }

    if (listening) {
      // testData.listening = await uploadTestData(listening || []);
      testData.listening = {
        individualQuestions: listening.individualQuestions,
        duration: listening.duration,
        marks: listening.marks,
        question: listening.question,
        data: await uploadTestData(listening?.data || []),
      };
    }

    if (aptitude) {
      // testData.aptitude = await uploadTestData(aptitude || []);
      testData.aptitude = {
        individualQuestions: aptitude.individualQuestions,
        duration: aptitude.duration,
        marks: aptitude.marks,
        question: aptitude.question,
        data: await uploadTestData(aptitude?.data || []),
      };
    }

    await Test.findByIdAndUpdate(check._id, testData);

    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Delete Test
exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await Test.findByIdAndDelete(id);
    if (!test) {
      return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
    }
    sendResponse(res, 200, null, Messages.DATA_DELETED);
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Get parent list by type
exports.getParentListByType = async (req, res) => {
  try {
    const { type } = req.body;

    // Dynamically get the model based on the type passed
    const model = mongoose.model(type);

    if (!model) {
      return sendResponse(res, 400, null, "Invalid model type provided");
    }

    const data = await model.find().select("name");

    sendResponse(res, 200, data, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - get plan by their types
exports.planByType = async (req, res) => {
  try {
    const { type } = req.body;

    // Check if 'type' is provided
    if (!type) {
      return res.status(400).json({ error: "Type is required." });
    }
    // Use regex to match any plan title that starts with the provided type
    const regex = new RegExp(`^${type}`, "i");
    const formattedData = await Plan.find({ title: regex }).select("title");

    // Check if plans were found
    if (!formattedData || formattedData.length === 0) {
      return sendResponse(
        res,
        400,
        null,
        "No plans found for the specified type."
      );
    }

    // Send the found plans
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(400).json({ error: "Internal Server Error" });
  }
};

/*------------------------- MOCK TEST WEB SECTION --------------------------*/

// Section - Get tests based on type for web
exports.getTestByType = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { parentId, testType, type } = req.body;

    // ✅ Fetch all tests based on parentId & testType
    const data = await Test.find({ parentId: parentId, testType: testType });
    const testIds = data.map((test) => test._id);

    // ✅ Choose collection dynamically
    let userTests = [];
    if (testType === "PracticeAssignment") {
      userTests = await UserPractice.find({
        userId: userId,
        testId: { $in: testIds },
      });
    } else {
      userTests = await UserTest.find({
        userId: userId,
        testId: { $in: testIds },
      });
    }

    // ✅ Helper: Get section completion status
    const getSectionStatus = (testId, sectionType) => {
      const userTest = userTests?.find((ut) => ut.testId.equals(testId));
      if (!userTest || !userTest[sectionType]) return null;
      return userTest[sectionType].isTestComplete;
    };

    // ✅ Format the data
    const formattedData = data
      .map((item) => {
        const baseData = {
          _id: item._id,
          testType: item.testType,
          parentId: item.parentId,
          name: item.name,
          totalQuestion: item.totalQuestion,
          totalMarks: item.totalMarks,
          duration: item.duration,
        };

        let hasValidData = false;

        // 📌 READING
        if (type === "reading" && item.reading?.data?.length > 0) {
          const sectionStatus = getSectionStatus(item._id, "reading");
          baseData.reading = [
            {
              individualQuestions: item?.reading?.individualQuestions ?? null,
              duration: item?.reading?.duration ?? null,
              marks: item?.reading?.marks ?? null,
              isTestComplete: sectionStatus,
              question:
                item?.reading?.question?.map((q) => ({
                  _id: q?._id ?? null,
                  questionNumber: q?.questionNumber ?? null,
                  type: q?.type ?? null,
                })) ?? [],
              data:
                item?.reading?.data?.map((d) => ({
                  _id: d?._id ?? null,
                  name: d?.name ?? null,
                  pdf: d?.pdf ?? null,
                  audio: d?.audio ?? null,
                  numberOfWord: d?.numberOfWord ?? null,
                })) ?? [],
            },
          ];
          hasValidData = true;
        }

        // 📌 WRITING
        else if (type === "writing" && item.writing?.data?.length > 0) {
          const sectionStatus = getSectionStatus(item._id, "writing");
          baseData.writing = [
            {
              individualQuestions: item?.writing?.individualQuestions ?? null,
              duration: item?.writing?.duration ?? null,
              marks: item?.writing?.marks ?? null,
              isTestComplete: sectionStatus,
              data:
                item?.writing?.data?.map((d) => ({
                  _id: d?._id ?? null,
                  name: d?.name ?? null,
                  pdf: d?.pdf ?? null,
                  audio: d?.audio ?? null,
                  numberOfWord: d?.numberOfWord ?? null,
                })) ?? [],
            },
          ];
          hasValidData = true;
        }

        // 📌 LISTENING
        else if (type === "listening" && item.listening?.data?.length > 0) {
          const sectionStatus = getSectionStatus(item._id, "listening");
          baseData.listening = [
            {
              individualQuestions: item?.listening?.individualQuestions ?? null,
              duration: item?.listening?.duration ?? null,
              marks: item?.listening?.marks ?? null,
              isTestComplete: sectionStatus,
              question:
                item?.listening?.question?.map((q) => ({
                  _id: q?._id ?? null,
                  questionNumber: q?.questionNumber ?? null,
                  type: q?.type ?? null,
                })) ?? [],
              data:
                item?.listening?.data?.map((d) => ({
                  _id: d?._id ?? null,
                  name: d?.name ?? null,
                  pdf: d?.pdf ?? null,
                  audio: d?.audio ?? null,
                  numberOfWord: d?.numberOfWord ?? null,
                })) ?? [],
            },
          ];
          hasValidData = true;
        }

        // 📌 APTITUDE
        else if (type === "aptitude" && item.aptitude?.data?.length > 0) {
          const sectionStatus = getSectionStatus(item._id, "aptitude");
          baseData.aptitude = [
            {
              individualQuestions: item?.aptitude?.individualQuestions ?? null,
              duration: item?.aptitude?.duration ?? null,
              marks: item?.aptitude?.marks ?? null,
              isTestComplete: sectionStatus,
              question:
                item?.aptitude?.question?.map((q) => ({
                  _id: q?._id ?? null,
                  questionNumber: q?.questionNumber ?? null,
                  type: q?.type ?? null,
                })) ?? [],
              data:
                item?.aptitude?.data?.map((d) => ({
                  _id: d?._id ?? null,
                  name: d?.name ?? null,
                  pdf: d?.pdf ?? null,
                  audio: d?.audio ?? null,
                  numberOfWord: d?.numberOfWord ?? null,
                })) ?? [],
            },
          ];
          hasValidData = true;
        }

        // 📌 SPEAKING
        else if (type === "speaking" && item.speaking?.data?.length > 0) {
          const sectionStatus = getSectionStatus(item._id, "speaking");
          baseData.speaking = [
            {
              individualQuestions: item?.speaking?.individualQuestions ?? null,
              duration: item?.speaking?.duration ?? null,
              marks: item?.speaking?.marks ?? null,
              isTestComplete: sectionStatus,

              data: item.speaking.data.map((d) => ({
                _id: d?._id ?? null,
                name: d?.name ?? null,
                pdf: d?.pdf ?? null,
                audio: d?.audio ?? null,
                numberOfWord: d?.numberOfWord ?? null,
                isUploadFiles: d?.isUploadFiles ?? false,
                uploadFiles: d?.uploadFiles ?? [],
              })),
            },
          ];
          hasValidData = true;
        }

        return hasValidData ? baseData : null;
      })
      .filter((item) => item !== null);

    // ✅ Send final response
    sendResponse(res, 200, formattedData, Messages.DATA_UPDATE);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

// Section - Get test by id for web
exports.testById = async (req, res) => {
  const { testId, type } = req.body;
  try {
    const test = await Test.findOne({ _id: testId });

    const formattedData = {
      _id: test?._id,
      name: test?.name ?? null,
      type,
    };

    // Helper to map question + data as tabs and add index
    const mapTabs = (questions = [], data = []) => {
      return data.map((d, index) => {
        const q = questions[index];
        return {
          _id: d?._id ?? null,
          index: index + 1,
          name: d?.name ?? null,
          pdf: d?.pdf ?? null,
          audio: d?.audio ?? null,
          numberOfWord: d?.numberOfWord ?? null,
          isUploadFiles: d?.isUploadFiles ?? false,
          uploadFiles: d?.uploadFiles ?? [],
          question: q
            ? {
                _id: q?._id ?? null,
                questionNumber: q?.questionNumber ?? null,
                type: q?.type ?? null,
                isUploadFiles: q?.isUploadFiles ?? false,
                uploadFiles: q?.uploadFiles ?? [],
              }
            : null,
        };
      });
    };

    const mapWritingTabs = (data = []) => {
      return data.map((d, index) => ({
        _id: d?._id ?? null,
        index: index + 1,
        name: d?.name ?? null,
        pdf: d?.pdf ?? null,
        audio: d?.audio ?? null,
        numberOfWord: d?.numberOfWord ?? null,
        isUploadFiles: d?.isUploadFiles ?? false,
        uploadFiles: d?.uploadFiles ?? [],
      }));
    };

    if (type === "reading") {
      formattedData.reading = {
        type: "reading",
        individualQuestions: test?.reading?.individualQuestions ?? null,
        duration: test?.reading?.duration ?? null,
        marks: test?.reading?.marks ?? null,
        tabs: mapTabs(test?.reading?.question, test?.reading?.data),
      };
    } else if (type === "writing") {
      formattedData.writing = {
        type: "writing",
        individualQuestions: test?.writing?.individualQuestions ?? null,
        duration: test?.writing?.duration ?? null,
        marks: test?.writing?.marks ?? null,
        tabs: mapWritingTabs(test?.writing?.data),
      };
    } else if (type === "listening") {
      formattedData.listening = {
        type: "listening",
        individualQuestions: test?.listening?.individualQuestions ?? null,
        duration: test?.listening?.duration ?? null,
        marks: test?.listening?.marks ?? null,
        tabs: mapTabs(test?.listening?.question, test?.listening?.data),
      };
    } else if (type === "aptitude") {
      formattedData.aptitude = {
        type: "aptitude",
        individualQuestions: test?.aptitude?.individualQuestions ?? null,
        duration: test?.aptitude?.duration ?? null,
        marks: test?.aptitude?.marks ?? null,
        tabs: mapTabs(test?.aptitude?.question, test?.aptitude?.data),
      };
    } else if (type === "speaking") {
      formattedData.speaking = {
        type: "speaking",
        individualQuestions: test?.speaking?.individualQuestions ?? null,
        duration: test?.speaking?.duration ?? null,
        marks: test?.speaking?.marks ?? null,
        tabs: mapTabs(test?.speaking?.question, test?.speaking?.data),
      };
    }

    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Get details how many types in that mockTest
exports.getTypes = async (req, res) => {
  try {
    const { parentId, testType } = req.body;
    const types = await Test.find({ parentId: parentId, testType: testType });
    if (types.length === 0) {
      return sendResponse(res, 200, null, Messages.DATA_NOT_FOUND);
    }

    const formattedData = {
      reading: types.some((type) => type?.reading?.data.length > 0),
      listening: types.some((type) => type?.listening?.data.length > 0),
      writing: types.some((type) => type?.writing?.data.length > 0),
      aptitude: types.some((type) => type?.aptitude?.data.length > 0),
      speaking: types.some((type) => type?.speaking.data.length > 0),
    };

    sendResponse(res, 200, formattedData, "Data retrieved successfully");
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Submit Answer

exports.submitAnswer = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { testId, type, testType } = req.body;

    // ✅ Safe parsing
    let data;
    if (typeof req.body.data === "string") {
      data = JSON.parse(req.body.data || "[]");
    } else if (typeof req.body.data === "object") {
      data = req.body.data || [];
    } else {
      data = [];
    }

    const test = await Test.findById(testId);
    if (!test) return sendResponse(res, 400, null, "Test not found");

    // ✅ Fetch parent mockTest only for mock tests
    let mockTestId = null;
    let courseId = null;
    let practiceAssignmentId = null;

    if (testType === "mock" && test.parentId) {
      const mockTest = await MockTest.findById(test.parentId);
      mockTestId = mockTest?._id;
      courseId = mockTest?.courseId;
    } else {
      const practiceTest = await PracticeAssignment.findById(test.parentId);
      practiceAssignmentId = practiceTest?._id;
      courseId = practiceTest?.courseId;
    }

    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() + 5);
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);

    let updateData = {};
    let unansweredCount = 0;

    // ✅ Group files by questionId
    const filesByQuestion = {};
    for (const f of req.files || []) {
      const match = /^uploadFiles\[(.+)\]$/.exec(f.fieldname);
      if (match) {
        const qid = match[1];
        (filesByQuestion[qid] = filesByQuestion[qid] || []).push(f);
      }
    }

    // ✅ Upload helper
    const uploadAllToS3 = async (files, folder) => {
      if (!files || files.length === 0) return [];
      const urls = [];
      for (const file of files) {
        const url = await uploadFileToS3(file, folder);
        urls.push(url);
      }
      return urls;
    };

    // ✅ READING / LISTENING / APTITUDE
    if (["reading", "listening", "aptitude"].includes(type)) {
      const formattedAnswers = await Promise.all(
        data.map(
          async ({ passageNumber, questionType, answer, questionId }) => {
            const answerArray = Array.isArray(answer) ? answer : [answer];
            const isUnanswered = answerArray.every((ans) => !ans || ans === "");
            if (isUnanswered) unansweredCount++;

            const filesForQuestion = filesByQuestion[questionId] || [];
            const s3Urls = await uploadAllToS3(filesForQuestion, type);

            return {
              passageNumber,
              questionType,
              answers: answerArray,
              correct: false,
              unanswered: isUnanswered,
              incorrect: false,
              uploadFiles: s3Urls,
            };
          }
        )
      );

      updateData[`${type}.data`] = formattedAnswers;
      updateData[`${type}.unanswered`] = unansweredCount;
      updateData[`${type}.isTestComplete`] = "pending";
      updateData[`${type}.submitDateTime`] = currentDateTime;
      updateData[`${type}.totalMarks`] = test[type]?.marks || 0;
    }

    // ✅ WRITING
    if (type === "writing") {
      const formattedWritingAnswers = await Promise.all(
        data.map(async ({ passageNumber, answer, questionId }, index) => {
          const numberOfWord = test.writing?.data?.[index]?.numberOfWord || 0;
          const s3Urls = await uploadAllToS3(
            filesByQuestion[questionId],
            "writing"
          );

          return {
            passageNumber,
            answers: Array.isArray(answer) ? answer[0] || "" : answer || "",
            numberOfWord,
            uploadFiles: s3Urls,
          };
        })
      );

      updateData["writing.data"] = formattedWritingAnswers;
      updateData["writing.isTestComplete"] = "pending";
      updateData["writing.submitDateTime"] = currentDateTime;
      updateData["writing.totalMarks"] = test.writing?.marks || 0;
    }

    // ✅ SPEAKING
    if (type === "speaking") {
      const hasFiles = Object.values(filesByQuestion).some(
        (arr) => arr && arr.length
      );
      if (!hasFiles)
        return sendResponse(res, 400, null, "Audio file is required");

      const formattedSpeakingAnswers = await Promise.all(
        data.map(async ({ passageNumber, questionId, answer }) => {
          const s3Urls = await uploadAllToS3(
            filesByQuestion[questionId],
            "speaking"
          );
          return {
            passageNumber,
            answers: Array.isArray(answer) ? answer : [answer || ""],
            uploadFiles: s3Urls,
          };
        })
      );

      updateData["speaking.data"] = formattedSpeakingAnswers;
      updateData["speaking.isTestComplete"] = "pending";
      updateData["speaking.submitDateTime"] = currentDateTime;
      updateData["speaking.totalMarks"] = test.speaking?.marks || 0;
    }

    // ✅ Save answers in respective collection
    let userTest;

    if (testType === "mock") {
      // Save in UserTest collection
      userTest = await UserTest.findOne({ userId, testId });
      if (!userTest) {
        userTest = new UserTest({ userId, mockTestId, testId, courseId });
      }
    } else {
      // Save in UserPractice collection
      userTest = await UserPractice.findOne({ userId, testId });
      if (!userTest) {
        userTest = new UserPractice({
          userId,
          testId,
          practiceAssignmentId,
          courseId,
        });
      }
    }

    // ✅ Set answers & save
    userTest.set(updateData);
    await userTest.save();

    sendResponse(res, 200, userTest, "Test submitted successfully");
  } catch (error) {
    console.error(error);
    sendResponse(res, 400, null, error.message);
  }
};
// Section - Get Submitted Answer of each user (Admin)
exports.getUserAnswer = async (req, res) => {
  try {
    const { userId, testId, type, testType } = req.body;

    if (!userId || !testId || !type || !testType) {
      return sendResponse(
        res,
        400,
        null,
        "userId, testId, type & testType are required"
      );
    }

    const UserModel =
      testType === "PracticeAssignment" ? UserPractice : UserTest;

    const populateFields =
      testType === "PracticeAssignment"
        ? [
            { path: "userId", select: "username" },
            { path: "testId", select: "name" },
            { path: "practiceAssignmentId", select: "name" },
            { path: "courseId", select: "title" },
            { path: `${type}.checkerId`, select: "name" },
          ]
        : [
            { path: "userId", select: "username" },
            { path: "mockTestId", select: "name" },
            { path: "testId", select: "name" },
            { path: "courseId", select: "title" },
            { path: `${type}.checkerId`, select: "name" },
          ];

    const userTest = await UserModel.findOne({ userId, testId }).populate(
      populateFields
    );

    if (!userTest) {
      return sendResponse(res, 404, null, "User Test/Practice data not found");
    }

    // Base structure
    const baseData = {
      _id: userTest._id,
      userId: userTest?.userId?._id || null,
      userName: userTest?.userId?.username || null,
      mockTestId:
        testType === "PracticeAssignment"
          ? userTest?.practiceAssignmentId?._id
          : userTest?.mockTestId?._id || null,
      mockTestName:
        testType === "PracticeAssignment"
          ? userTest?.practiceAssignmentId?.name
          : userTest?.mockTestId?.name || null,
      testId: userTest?.testId?._id || null,
      testName: userTest?.testId?.name || null,
      courseId: userTest?.courseId?._id || null,
      courseName: userTest?.courseId?.title || null,
      isTestChecked: userTest?.isTestChecked || false,
      type: type,
    };

    // If writing type, handle separately
    if (type === "writing") {
      const writingData =
        userTest.writing?.data?.map((ele) => ({
          passageNumber: ele.passageNumber ?? 0,
          answers: ele.answers ?? null,
          numberOfWord: ele.numberOfWord ?? 0,
        })) ?? [];

      baseData.writing = {
        data: writingData,
        totalMarks: userTest.writing?.totalMarks || null,
        obtainMarks: userTest.writing?.obtainMarks || 0,
        facultyFeedback: userTest.writing?.facultyFeedback || "",
        answerKeyUrl: userTest.writing?.answerKeyUrl || null,
      };

      return res.send(baseData);
    }

    // Helper to map other test types dynamically
    const mapAnswers = (section) => {
      if (!userTest[section]?.data?.length) return null;

      return {
        data: userTest[section].data.map((ele) => ({
          questionNumber: ele.questionNumber,
          questionType: ele.questionType,
          answer: ele.answers, // non-writing uses answers too
          correct: ele.correct || false,
          unanswered: ele.unanswered || false,
          incorrect: ele.incorrect || false,
          totalMarks: ele.totalMarks || null,
        })),
        checkerName: userTest[section]?.checkerId?.name || null,
        totalCorrect:
          userTest[section]?.totalCorrect || userTest[section]?.correct || 0,
        totalUnanswered:
          userTest[section]?.totalUnanswered ||
          userTest[section]?.unanswered ||
          0,
        totalIncorrect:
          userTest[section]?.totalIncorrect ||
          userTest[section]?.incorrect ||
          0,
        totalMarks: userTest[section]?.totalMarks || null,
        obtainMarks: userTest[section]?.obtainMarks || 0,
        facultyFeedback: userTest[section]?.facultyFeedback || "",
        answerKeyUrl: userTest[section]?.answerKeyUrl || null,
      };
    };

    const sectionData = mapAnswers(type);

    if (!sectionData) {
      return sendResponse(
        res,
        200,
        null,
        `No data found for the provided test type: ${type}`
      );
    }

    // Assign to baseData dynamically
    baseData[type] = sectionData;

    res.send(baseData);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Admin check the submitted answer (Admin)
// exports.adminCheckAnswer = async (req, res) => {
//   try {
//     const {
//       testId,
//       userId,
//       data,
//       type,
//       obtainMarks,
//       facultyFeedback,
//       testType,
//     } = req.body;

//     const parsedMarks = !isNaN(obtainMarks) ? Number(obtainMarks) : 0;

//     // ✅ Choose collection based on testType
//     const Model = testType === "PracticeAssignment" ? UserPractice : UserTest;

//     // ✅ Find user test/practice
//     const userTest = await Model.findOne({ testId, userId });
//     if (!userTest) {
//       return sendResponse(res, 404, null, "User Test not found");
//     }

//     let totalCorrect = 0;
//     let totalIncorrect = 0;

//     if (data.length > 0) {
//       data.forEach((item) => {
//         if (item.correct) totalCorrect++;
//         else if (item.incorrect) totalIncorrect++;
//       });
//     }

//     // ✅ Update the relevant section based on type
//     const updateSection = (section) => {
//       const existingData = userTest[section]?.data || [];
//       const newData = data || [];

//       // ✅ Merge existing + new answers
//       const mergedData = existingData.map((item, index) => {
//         const newItem = newData[index];

//         if (newItem) {
//           return {
//             ...item,
//             ...newItem,
//             answers: newItem.answer?.length
//               ? newItem.answer
//               : item.answers || [], // ✅ Keep old answers if not sent
//             uploadFiles: newItem.uploadFiles?.length
//               ? newItem.uploadFiles
//               : item.uploadFiles || [], // ✅ Keep old uploads if not sent
//           };
//         }
//         return item;
//       });

//       // ✅ If new questions are extra, append them
//       if (newData.length > existingData.length) {
//         for (let i = existingData.length; i < newData.length; i++) {
//           mergedData.push(newData[i]);
//         }
//       }

//       // ✅ Assign merged data
//       userTest[section].data = mergedData;
//       userTest[section].correct = totalCorrect;
//       userTest[section].incorrect = totalIncorrect;
//       userTest[section].obtainMarks = parsedMarks;
//       userTest[section].facultyFeedback = facultyFeedback;
//       userTest[section].checkerId = req?.meta?._id;
//       userTest[section].isTestComplete = "checked";
//     };

//     if (type === "reading") updateSection("reading");
//     else if (type === "listening") updateSection("listening");
//     else if (type === "aptitude") updateSection("aptitude");
//     else if (type === "speaking") updateSection("speaking");
//     else if (type === "writing") updateSection("writing");
//     else {
//       return sendResponse(res, 400, null, "Invalid type provided");
//     }

//     // ✅ Check if any test is checked
//     const isAnyTestChecked =
//       userTest.reading?.isTestComplete === "checked" ||
//       userTest.listening?.isTestComplete === "checked" ||
//       userTest.aptitude?.isTestComplete === "checked" ||
//       userTest.writing?.isTestComplete === "checked" ||
//       userTest.speaking?.isTestComplete === "checked";

//     if (isAnyTestChecked) {
//       userTest.isTestChecked = true;
//       userTest.isTestComplete = true;
//     }

//     // ✅ Check if all tests are checked
//     const isAllTestChecked =
//       userTest.reading?.isTestComplete === "checked" &&
//       userTest.listening?.isTestComplete === "checked" &&
//       userTest.aptitude?.isTestComplete === "checked" &&
//       userTest.writing?.isTestComplete === "checked" &&
//       userTest.speaking?.isTestComplete === "checked";

//     if (isAllTestChecked) {
//       userTest.isMockTestComplete = true;
//     }

//     await userTest.save();

//     return sendResponse(res, 200, userTest, "User Test updated successfully");
//   } catch (error) {
//     console.error("Error in adminCheckAnswer:", error);
//     sendResponse(res, 500, null, error.message);
//   }
// };

//Section - Admin check the submitted answer (Admin)
exports.adminCheckAnswer = async (req, res) => {
  try {
    const {
      testId,
      userId,
      data,
      type,
      obtainMarks,
      facultyFeedback,
      testType,
    } = req.body;

    const parsedMarks = !isNaN(obtainMarks) ? Number(obtainMarks) : 0;
    const parsedData = data ? JSON.parse(data) : [];

    // ✅ Choose collection based on testType
    const Model = testType === "PracticeAssignment" ? UserPractice : UserTest;

    // ✅ Find user test/practice
    const userTest = await Model.findOne({ testId, userId });
    if (!userTest) {
      return sendResponse(res, 404, null, "User Test not found");
    }

    // ✅ Handle uploaded Answer Key PDF
    let answerKeyUrl = null;
    if (req.file) {
      answerKeyUrl = await uploadFileToS3(req.file, "answerKeys");
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;

    if (parsedData.length > 0) {
      parsedData.forEach((item) => {
        if (item.correct) totalCorrect++;
        else if (item.incorrect) totalIncorrect++;
      });
    }

    // ✅ Update the relevant section based on type
    const updateSection = (section) => {
      const existingData = userTest[section]?.data || [];
      const newData = parsedData || [];

      // ✅ Merge existing + new answers
      const mergedData = existingData.map((item, index) => {
        const newItem = newData[index];
        if (newItem) {
          return {
            ...item,
            ...newItem,
            answers: newItem.answer?.length
              ? newItem.answer
              : item.answers || [],
            uploadFiles: newItem.uploadFiles?.length
              ? newItem.uploadFiles
              : item.uploadFiles || [],
          };
        }
        return item;
      });

      // ✅ Append extra new questions if any
      if (newData.length > existingData.length) {
        for (let i = existingData.length; i < newData.length; i++) {
          mergedData.push(newData[i]);
        }
      }

      // ✅ Assign merged data + additional fields
      userTest[section].data = mergedData;
      userTest[section].correct = totalCorrect;
      userTest[section].incorrect = totalIncorrect;
      userTest[section].obtainMarks = parsedMarks;
      userTest[section].facultyFeedback = facultyFeedback;
      userTest[section].checkerId = req?.meta?._id;
      userTest[section].isTestComplete = "checked";

      // ✅ Save the uploaded Answer Key URL if provided
      if (answerKeyUrl) {
        userTest[section].answerKeyUrl = answerKeyUrl;
      }
    };

    if (type === "reading") updateSection("reading");
    else if (type === "listening") updateSection("listening");
    else if (type === "aptitude") updateSection("aptitude");
    else if (type === "speaking") updateSection("speaking");
    else if (type === "writing") updateSection("writing");
    else {
      return sendResponse(res, 400, null, "Invalid type provided");
    }

    // ✅ Check completion flags
    const isAnyTestChecked =
      userTest.reading?.isTestComplete === "checked" ||
      userTest.listening?.isTestComplete === "checked" ||
      userTest.aptitude?.isTestComplete === "checked" ||
      userTest.writing?.isTestComplete === "checked" ||
      userTest.speaking?.isTestComplete === "checked";

    if (isAnyTestChecked) {
      userTest.isTestChecked = true;
      userTest.isTestComplete = true;
    }

    const isAllTestChecked =
      userTest.reading?.isTestComplete === "checked" &&
      userTest.listening?.isTestComplete === "checked" &&
      userTest.aptitude?.isTestComplete === "checked" &&
      userTest.writing?.isTestComplete === "checked" &&
      userTest.speaking?.isTestComplete === "checked";

    if (isAllTestChecked) {
      userTest.isMockTestComplete = true;
    }

    await userTest.save();

    return sendResponse(res, 200, userTest, "User Test updated successfully");
  } catch (error) {
    console.error("Error in adminCheckAnswer:", error);
    sendResponse(res, 500, null, error.message);
  }
};

// Section - Get student list those who give test
exports.getStudent = async (req, res) => {
  try {
    const { testId, testType } = req.body;

    // ✅ Validate request
    if (!testId || !testType) {
      return sendResponse(res, 400, null, "Test ID & Test Type are required");
    }

    // ✅ Fetch the test
    const test = await Test.findById(testId);
    if (!test) {
      return sendResponse(res, 404, null, "Test not found");
    }

    // ✅ Choose the correct model dynamically
    const StudentModel =
      testType === "PracticeAssignment" ? UserPractice : UserTest;

    // ✅ Fetch students with populated user data
    const students = await StudentModel.find({ testId }).populate([
      { path: "userId", select: "username image" },
    ]);

    // ✅ Helper: Check if a test section is completed
    const isTestComplete = (testSection) => {
      return testSection?.isTestComplete ? testSection?.isTestComplete : false;
    };

    // ✅ Helper: Get dynamic active sections & their completion status
    const getActiveSectionsStatus = (test, userTest) => {
      const result = {};

      ["reading", "listening", "writing", "aptitude", "speaking"].forEach(
        (section) => {
          const status = isTestComplete(userTest[section], section);

          // ✅ Include only if status is NOT false
          if (status !== false) {
            result[section] = status;
          }
        }
      );

      return result;
    };

    // ✅ Prepare final response
    const formattedResult = await Promise.all(
      students.map(async (item) => {
        const sectionStatuses = getActiveSectionsStatus(test, item);

        return {
          userId: item?.userId?._id ?? null,
          userName: item?.userId?.username ?? null,
          userImage: item?.userId?.image
            ? await getSignedUrlImage(item?.userId?.image)
            : null,
          ...sectionStatuses,
        };
      })
    );

    // ✅ Send success response
    sendResponse(res, 200, formattedResult, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error("❌ Error in getStudent:", error);
    sendResponse(res, 500, null, error.message || "Internal Server Error");
  }
};
// Section - Get Admin checked answer to user
exports.getUserCheckAnswer = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { testId, type, testType } = req.body;

    // ✅ Validate required fields
    if (!userId || !testId || !type || !testType) {
      return sendResponse(
        res,
        400,
        null,
        "userId, testId, type & testType are required"
      );
    }

    // ✅ Select the correct model based on testType
    const UserModel =
      testType === "PracticeAssignment" ? UserPractice : UserTest;

    // ✅ Populate fields conditionally based on testType
    const populateFields =
      testType === "PracticeAssignment"
        ? [
            { path: "userId", select: "username" },
            { path: "testId", select: "name" },
            { path: "practiceAssignmentId", select: "name" },
            { path: "courseId", select: "title" },
            { path: `${type}.checkerId`, select: "name" },
          ]
        : [
            { path: "userId", select: "username" },
            { path: "mockTestId", select: "name" },
            { path: "testId", select: "name" },
            { path: "courseId", select: "title" },
            { path: `${type}.checkerId`, select: "name" },
          ];

    // ✅ Find user test/practice data
    const userTest = await UserModel.findOne({ userId, testId }).populate(
      populateFields
    );

    if (!userTest) {
      return sendResponse(res, 404, null, "User test data not found");
    }

    // ✅ Base structure for response
    const baseData = {
      _id: userTest._id,
      userId: userTest?.userId?._id ?? null,
      userName: userTest?.userId?.username ?? null,
      mockTestId:
        testType === "PracticeAssignment"
          ? userTest?.practiceAssignmentId?._id
          : userTest?.mockTestId?._id ?? null,
      mockTestName:
        testType === "PracticeAssignment"
          ? userTest?.practiceAssignmentId?.name
          : userTest?.mockTestId?.name ?? null,
      testId: userTest?.testId?._id ?? null,
      testName: userTest?.testId?.name ?? null,
      courseId: userTest?.courseId?._id ?? null,
      courseName: userTest?.courseId?.title ?? null,
      isTestChecked: userTest?.isTestChecked ?? false,
      type: type,
    };

    // ✅ Helper function to format test sections with safe defaults
    const formatSection = (section) => ({
      data:
        section?.data?.map((ele) => ({
          questionNumber: ele.questionNumber ?? null,
          passageNumber: ele.passageNumber ?? null,
          questionType: ele.questionType ?? null,
          answer: ele.answers ?? [],
          correct: ele.correct ?? false,
          unanswered: ele.unanswered ?? false,
          incorrect: ele.incorrect ?? false,
          totalMarks: ele.totalMarks ?? 0,
        })) ?? [],
      checkerName: section?.checkerId?.name ?? "",
      totalCorrect: section?.correct ?? 0,
      totalUnanswered: section?.unanswered ?? 0,
      totalIncorrect: section?.incorrect ?? 0,
      totalMarks: section?.totalMarks ?? 0,
      obtainMarks: section?.obtainMarks ?? 0,
      facultyFeedback: section?.facultyFeedback ?? "",
      answerKeyUrl: section?.answerKeyUrl ?? null,
    });

    // ✅ Add section data dynamically
    if (type === "reading") baseData.reading = formatSection(userTest.reading);
    else if (type === "writing")
      baseData.writing = formatSection(userTest.writing);
    else if (type === "listening")
      baseData.listening = formatSection(userTest.listening);
    else if (type === "aptitude")
      baseData.aptitude = formatSection(userTest.aptitude);
    else if (type === "speaking")
      baseData.speaking = formatSection(userTest.speaking);

    // ✅ Always return safe empty structure if no data found
    if (!baseData[type]) {
      baseData[type] = formatSection({});
    }

    // ✅ Send final response
    return sendResponse(
      res,
      200,
      baseData,
      "User test data fetched successfully"
    );
  } catch (error) {
    console.error("Error in getUserCheckAnswer:", error);
    return sendResponse(res, 500, null, "Internal Server Error");
  }
};

//Section - Get how many mockTest is given by user (performance)
exports.getUserMockTestCount = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { type, planId } = req.body;

    const userProductFilter = { userId };

    if (planId) {
      userProductFilter.planId = planId;
    }

    const userProductDetails = await UserProductDetails.find(
      userProductFilter
    ).select("planId");
    const userPlanIds = userProductDetails.map((item) => item.planId);

    const mockTests = await MockTest.find({
      courseId: { $in: userPlanIds },
    }).select("_id");

    const mockTestIds = mockTests.map((mockTest) => mockTest._id);

    // Step 3: Apply dynamic query filter based on type, isTestComplete status, and mockTestIds
    const queryFilter = {
      userId,
      mockTestId: { $in: mockTestIds },
      [`${type}.isTestComplete`]: "checked",
    };

    const userTests = await UserTest.find(queryFilter).populate([
      { path: "userId", select: "username" },
      { path: "mockTestId", select: `name date time` },
      {
        path: "testId",
        select: `name ${type}.individualQuestions ${type}.duration ${type}.marks`,
      },
      { path: "courseId", select: "title" },
      { path: `${type}.checkerId`, select: "name" },
    ]);

    // If no userTests found, send an empty response
    if (!userTests || userTests.length === 0) {
      return sendResponse(
        res,
        200,
        [],
        "Sorry you don't have any test for this type"
      );
    }

    // Structure to store each UserTest entry
    const responseData = userTests.map((item) => {
      const baseData = {
        _id: item._id,
        userId: item.userId?._id ?? null,
        userName: item.userId?.username ?? null,
        mockTestId: item.mockTestId?._id ?? null,
        mockTestName: item.mockTestId?.name ?? null,
        mockTestDate: item.mockTestId?.date ?? null,
        mockTestTime: item.mockTestId?.time ?? null,
        testId: item.testId?._id ?? null,
        testName: item.testId?.name ?? null,
        testTotalQuestions: item.testId?.[type]?.individualQuestions ?? null,
        testDuration: item.testId?.[type]?.duration ?? null,
        testMarks: item.testId?.[type]?.marks ?? null,
        courseId: item.courseId?._id ?? null,
        courseName: item.courseId?.title ?? null,
        isTestChecked: item.isTestChecked,
        type: type,
      };

      // Append test data based on the specified type
      if (type === "reading" && item.reading?.data) {
        baseData.reading = {
          // data: item.reading.data.map(ele => ({
          //     correct: ele.correct,
          //     unanswered: ele.unanswered,
          //     incorrect: ele.incorrect,
          // })),
          checkerName: item.reading?.checkerId?.name ?? null,
          totalCorrect: item.reading.correct ?? null,
          totalUnanswered: item.reading.unanswered ?? null,
          totalIncorrect: item.reading.incorrect ?? null,
          totalMarks: item.reading.totalMarks ?? null,
          obtainMarks: item.reading.obtainMarks ?? null,
          isTestComplete: item.reading.isTestComplete ?? null,
          facultyFeedback: item.reading.facultyFeedback ?? null,
        };
      } else if (type === "writing" && item.writing?.data) {
        baseData.writing = {
          // data: item.writing.data.map(ele => ({
          //     passageNumber: ele.passageNumber,
          //     answers: ele.answers,
          //     numberOfWord: ele.numberOfWord,
          // })),
          checkerName: item.writing?.checkerId?.name ?? null,
          totalCorrect: item.writing.correct ?? null,
          totalUnanswered: item.writing.unanswered ?? null,
          totalIncorrect: item.writing.incorrect ?? null,
          totalMarks: item.writing.totalMarks ?? null,
          obtainMarks: item.writing.obtainMarks ?? null,
          isTestComplete: item.writing.isTestComplete ?? null,
          facultyFeedback: item.writing.facultyFeedback ?? null,
        };
      } else if (type === "listening" && item.listening?.data) {
        baseData.listening = {
          // data: item.listening.data.map(ele => ({
          //     correct: ele.correct,
          //     unanswered: ele.unanswered,
          //     incorrect: ele.incorrect,
          //     totalMarks: ele.totalMarks,
          // })),
          checkerName: item.listening?.checkerId?.name ?? null,
          totalCorrect: item.listening.correct ?? null,
          totalUnanswered: item.listening.unanswered ?? null,
          totalIncorrect: item.listening.incorrect ?? null,
          totalMarks: item.listening.totalMarks ?? null,
          obtainMarks: item.listening.obtainMarks ?? null,
          isTestComplete: item.listening.isTestComplete ?? null,
          facultyFeedback: item.listening.facultyFeedback ?? null,
        };
      } else if (type === "aptitude" && item.aptitude?.data) {
        baseData.aptitude = {
          // data: item.aptitude.data.map(ele => ({
          //     correct: ele.correct,
          //     unanswered: ele.unanswered,
          //     incorrect: ele.incorrect,
          //     totalMarks: ele.totalMarks,
          // })),
          checkerName: item.aptitude?.checkerId?.name ?? null,
          totalCorrect: item.aptitude.correct ?? null,
          totalUnanswered: item.aptitude.unanswered ?? null,
          totalIncorrect: item.aptitude.incorrect ?? null,
          totalMarks: item.aptitude.totalMarks ?? null,
          obtainMarks: item.aptitude.obtainMarks ?? null,
          isTestComplete: item.aptitude.isTestComplete ?? null,
          facultyFeedback: item.aptitude.facultyFeedback ?? null,
        };
      } else if (type === "speaking") {
        baseData.speaking = {
          checkerName: item.speaking?.checkerId?.name ?? null,
          totalCorrect: item.speaking.correct ?? null,
          totalUnanswered: item.speaking.unanswered ?? null,
          totalIncorrect: item.speaking.incorrect ?? null,
          totalMarks: item.speaking.totalMarks ?? null,
          obtainMarks: item.speaking.obtainMarks ?? null,
          isTestComplete: item.speaking.isTestComplete ?? null,
          facultyFeedback: item.speaking.facultyFeedback ?? null,
        };
      }

      return baseData;
    });
    sendResponse(res, 200, responseData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(
      res,
      500,
      null,
      "An error occurred while fetching user test data"
    );
  }
};

//Section - Get mockTest marks to make graph (performance)
exports.mockTestGraph = async (req, res) => {
  try {
    const { id } = req.meta; // user ID
    const { planId } = req.query; // optional plan ID filter

    const userProductFilter = { userId: id };
    if (planId) {
      userProductFilter.planId = planId; // filter by specific planId if provided
    }

    const userProductDetails = await UserProductDetails.find(
      userProductFilter
    ).select("planId");
    const userPlanIds = userProductDetails.map((item) => item.planId);
    // Step 2: Retrieve mockTestIds based on userPlanIds from MockTest
    const mockTests = await MockTest.find({
      courseId: { $in: userPlanIds },
    }).select("_id");

    const mockTestIds = mockTests.map((mockTest) => mockTest._id);

    // Step 3: Build the filter for UserTest query
    const filter = {
      userId: id,
      mockTestId: { $in: mockTestIds },
      $or: [
        { "reading.isTestComplete": "checked" },
        { "listening.isTestComplete": "checked" },
        { "aptitude.isTestComplete": "checked" },
        { "writing.isTestComplete": "checked" },
      ],
    };
    // Step 1: Get the user's mock tests
    const userTests = await UserTest.find(filter)
      .select({
        testId: 1,
        mockTestId: 1,
        userId: 1,
        reading: 1,
        writing: 1,
        listening: 1,
        aptitude: 1,
      })
      .populate([
        { path: "testId", select: "name types" },
        { path: "mockTestId", select: "name" },
        { path: "userId", select: "username" },
      ]);

    // Step 2: Format the data based on available test types
    const result = userTests.map((item) => {
      const testTypes = item.testId.types;
      const filteredMarks = {};

      if (testTypes.includes("reading") && item.reading) {
        filteredMarks.reading = {
          totalMarks: item.reading.totalMarks,
          obtainMarks: item.reading.obtainMarks,
          isTestComplete: item.reading.isTestComplete,
        };
      }
      if (testTypes.includes("writing") && item.writing) {
        filteredMarks.writing = {
          totalMarks: item.writing.totalMarks,
          obtainMarks: item.writing.obtainMarks,
          isTestComplete: item.writing.isTestComplete,
        };
      }
      if (testTypes.includes("listening") && item.listening) {
        filteredMarks.listening = {
          totalMarks: item.listening.totalMarks,
          obtainMarks: item.listening.obtainMarks,
          isTestComplete: item.listening.isTestComplete,
        };
      }
      if (testTypes.includes("aptitude") && item.aptitude) {
        filteredMarks.aptitude = {
          totalMarks: item.aptitude.totalMarks,
          obtainMarks: item.aptitude.obtainMarks,
          isTestComplete: item.aptitude.isTestComplete,
        };
      }
      return {
        testId: item?.testId?._id,
        testName: item?.testId?.name,
        mockTestId: item?.mockTestId?._id,
        mockTestName: item?.mockTestId?.name,
        userId: item?.userId?._id,
        userName: item?.userId?.username,
        marks: filteredMarks,
      };
    });

    sendResponse(res, 200, result, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 400, null, error.message);
  }
};

exports.webDashboard = async (req, res) => {
  try {
    const studentId = req.meta._id;
    let { batchId } = req.query;

    // Get latest batch if not provided
    if (!batchId) {
      const assignedBatch = await Batch.findOne({ students: studentId }).sort({
        createdAt: -1,
      });

      if (!assignedBatch) {
        return sendResponse(
          res,
          404,
          null,
          "You are not assigned to any batch"
        );
      }

      batchId = assignedBatch._id;
    }

    // Get student info
    const student = await studentModel
      .findById(studentId)
      .select("name email image location");

    const batchDetails = await Batch.findById(batchId).populate([
      "classes",
      "mockTests",
    ]);

    // Classes
    const totalClass = batchDetails?.classes || [];

    const attendClass = await UserAttendance.countDocuments({
      classId: { $in: totalClass },
      isAttend: true,
    });

    const classes = {
      totalClass: totalClass?.length || 0,
      attendClass,
    };

    const now = new Date();

    // Upcoming classes
    const upcomingClasses = totalClass
      .filter((cls) => new Date(cls.date) >= now)
      .map((item) => ({
        _id: item?._id,
        name: item?.name,
        date: item?.date,
        meetingLink: item?.meetingLink,
        duration: item?.duration,
      }));

    // --------------------------- MOCK TEST SECTION -----------------------------

    const totalMockTests = batchDetails?.mockTests || [];
    const mockTestIds = totalMockTests.map((test) => test._id);

    // Get user's attempted mock tests
    const filteredMockTests = await UserTest.find({
      userId: studentId,
      mockTestId: { $in: mockTestIds },
      $or: [{ isTestComplete: true }, { isMockTestComplete: true }],
    })
      .populate("testId") // To access totalMarks and types
      .lean();

    // Sort attempted mock tests by startDate descending (latest first)
    const sortedByStartDate = [...filteredMockTests].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    const latestMockTest = sortedByStartDate[0] || null;

    // Format latest mock test details
    let formattedLatestMockTest = null;
    if (latestMockTest?.testId) {
      const test = latestMockTest.testId;
      const tests = {
        reading: latestMockTest.reading?.obtainMarks || 0,
        writing: latestMockTest.writing?.obtainMarks || 0,
        listening: latestMockTest.listening?.obtainMarks || 0,
        aptitude: latestMockTest.aptitude?.obtainMarks || 0,
        speaking: latestMockTest.speaking?.obtainMarks || 0,
      };

      formattedLatestMockTest = {
        totalScore: test.totalMarks || 0,
        obtainScore: Object.values(tests).reduce((a, b) => a + b, 0),
        tests,
        types: test.types || [],
        date: latestMockTest.createdAt,
      };
    }

    // Filter upcoming mock tests (date + time > now)
    const upcomingMockTests = totalMockTests
      .filter((test) => {
        const testDateTime = new Date(test.date);
        const [hours, minutes] = test.time?.split(":") || ["00", "00"];
        testDateTime.setHours(parseInt(hours, 10));
        testDateTime.setMinutes(parseInt(minutes, 10));
        testDateTime.setSeconds(0);
        return testDateTime > now;
      })
      .sort((a, b) => {
        const aDate = new Date(a.date);
        const bDate = new Date(b.date);
        const [aHours, aMinutes] = a.time?.split(":") || ["00", "00"];
        const [bHours, bMinutes] = b.time?.split(":") || ["00", "00"];
        aDate.setHours(parseInt(aHours), parseInt(aMinutes), 0);
        bDate.setHours(parseInt(bHours), parseInt(bMinutes), 0);
        return aDate - bDate;
      })
      .map((test) => ({
        _id: test._id,
        name: test.name,
        date: test.date,
        time: test.time,
        testType: "MockTest",
      }));

    // Mock test progress
    const mockTestProgress = {
      totalMockTests: totalMockTests.length,
      completedMockTests: filteredMockTests.length,
    };

    // ----------------------- PRACTICE ASSIGNMENT SECTION --------------------------
    const practiceIds = totalClass
      .filter((cls) => cls.practiceId)
      .map((cls) => cls.practiceId);

    const completedPracticeAssignments = await UserPractice.find({
      userId: studentId,
      assignmentId: { $in: practiceIds },
      isTestComplete: true,
    }).lean();

    const upcomingPracticeAssignments = totalClass
      .filter((cls) => new Date(cls.date) > now)
      .map((cls) => ({
        _id: cls.practiceId,
        name: cls.name,
        date: cls.date,
        assignmentType: "PracticeAssignment",
      }))
      .filter((item) => item._id);

    const practiceAssignmentProgress = {
      totalPracticeAssignments: practiceIds.length,
      completedPracticeAssignments: completedPracticeAssignments.length,
    };

    const myProgress = {
      attendance: attendClass,
      mocktest: filteredMockTests.length,
    };

    // Final response
    return sendResponse(res, 200, {
      student,
      classes,
      upcomingClasses,
      latestMockTest: formattedLatestMockTest,
      upcomingMockTests,
      mockTestProgress,
      upcomingPracticeAssignments,
      practiceAssignmentProgress,
      myProgress,
    });
  } catch (error) {
    console.error("Dashboard error =>", error);
    return sendResponse(res, 500, null, "Something went wrong");
  }
};

/*------------------------- PRACTICES ASSIGNMENT WEB SECTION --------------------------*/

//Section - Get details how many types of test in that Learning resource
exports.getPracticeTypes = async (req, res) => {
  try {
    const { parentId, testType } = req.body;
    const types = await Test.find({ parentId: parentId, testType: testType });
    if (types.length === 0) {
      return sendResponse(res, 200, null, Messages.DATA_NOT_FOUND);
    }

    const formattedData = {
      reading: types.some((type) => type?.reading?.data.length > 0),
      listening: types.some((type) => type?.listening?.data.length > 0),
      writing: types.some((type) => type?.writing?.data.length > 0),
      aptitude: types.some((type) => type?.aptitude?.data.length > 0),
      speaking: types.some((type) => type?.speaking.length > 0),
    };

    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Get practice test based on type for web
exports.getPracticeByType = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { parentId, testType, type } = req.body;

    // Find tests based on parentId and testType
    const data = await Test.find({
      parentId: parentId,
      testType: testType,
    });
    const testIds = data.map((test) => test._id);

    // Fetch user test data for the relevant test IDs
    const userTests = await UserPractice.find({
      userId: userId,
      testId: { $in: testIds },
    });

    // Helper function to get the section status from UserTest
    const getSectionStatus = (testId, sectionType) => {
      const userTest = userTests?.find((ut) => ut.testId.equals(testId));

      // If no userTest exists, return null (i.e., omit 'isTestComplete')
      if (!userTest || !userTest[sectionType]) return null;

      // Return the isTestComplete status ('pending' or 'checked')
      return userTest[sectionType].isTestComplete;
    };

    // Format the data to only include tests with valid data for the requested type
    const formattedData = data
      .map((item) => {
        // Create a base structure with common fields
        const baseData = {
          _id: item._id,
          testType: item.testType,
          parentId: item.parentId,
          name: item.name,
          totalQuestion: item.totalQuestion,
          totalMarks: item.totalMarks,
          duration: item.duration,
        };

        // Initialize a flag to check if the test contains valid data for the requested type
        let hasValidData = false;

        // Check for specific type and filter accordingly
        if (
          type === "reading" &&
          item.reading &&
          item.reading.data &&
          item.reading.data.length > 0
        ) {
          const sectionStatus = getSectionStatus(item._id, "reading");
          const readingData = [
            {
              individualQuestions: item?.reading?.individualQuestions ?? null,
              duration: item?.reading?.duration ?? null,
              marks: item?.reading?.marks ?? null,
              isTestComplete: sectionStatus,
              question:
                item?.reading?.question?.map((q) => ({
                  _id: q?._id ?? null,
                  questionNumber: q?.questionNumber ?? null,
                  type: q?.type ?? null,
                })) ?? [],
              data:
                item?.reading?.data?.map((d) => ({
                  _id: d?._id ?? null,
                  name: d?.name ?? null,
                  pdf: d?.pdf ?? null,
                  audio: d?.audio ?? null,
                  numberOfWord: d?.numberOfWord ?? null,
                })) ?? [],
            },
          ];
          baseData.reading = readingData;
          hasValidData = true;
        } else if (
          type === "writing" &&
          item.writing &&
          item.writing.data &&
          item.writing.data.length > 0
        ) {
          const sectionStatus = getSectionStatus(item._id, "writing");
          const writingData = [
            {
              individualQuestions: item?.writing?.individualQuestions ?? null,
              duration: item?.writing?.duration ?? null,
              marks: item?.writing?.marks ?? null,
              isTestComplete: sectionStatus,
              data:
                item?.writing?.data?.map((d) => ({
                  _id: d?._id ?? null,
                  name: d?.name ?? null,
                  pdf: d?.pdf ?? null,
                  audio: d?.audio ?? null,
                  numberOfWord: d?.numberOfWord ?? null,
                })) ?? [],
            },
          ];
          baseData.writing = writingData;
          hasValidData = true;
        } else if (
          type === "listening" &&
          item.listening &&
          item.listening.data &&
          item.listening.data.length > 0
        ) {
          const sectionStatus = getSectionStatus(item._id, "listening");
          const listeningData = [
            {
              individualQuestions: item?.listening?.individualQuestions ?? null,
              duration: item?.listening?.duration ?? null,
              marks: item?.listening?.marks ?? null,
              isTestComplete: sectionStatus,
              question:
                item?.listening?.question?.map((q) => ({
                  _id: q?._id ?? null,
                  questionNumber: q?.questionNumber ?? null,
                  type: q?.type ?? null,
                })) ?? [],
              data:
                item?.listening?.data?.map((d) => ({
                  _id: d?._id ?? null,
                  name: d?.name ?? null,
                  pdf: d?.pdf ?? null,
                  audio: d?.audio ?? null,
                  numberOfWord: d?.numberOfWord ?? null,
                })) ?? [],
            },
          ];
          baseData.listening = listeningData;
          hasValidData = true;
        } else if (
          type === "aptitude" &&
          item.aptitude &&
          item.aptitude.data &&
          item.aptitude.data.length > 0
        ) {
          const sectionStatus = getSectionStatus(item._id, "aptitude");
          const aptitudeData = [
            {
              individualQuestions: item?.aptitude?.individualQuestions ?? null,
              duration: item?.aptitude?.duration ?? null,
              marks: item?.aptitude?.marks ?? null,
              isTestComplete: sectionStatus,
              question:
                item?.aptitude?.question?.map((q) => ({
                  _id: q?._id ?? null,
                  questionNumber: q?.questionNumber ?? null,
                  type: q?.type ?? null,
                })) ?? [],
              data:
                item?.aptitude?.data?.map((d) => ({
                  _id: d?._id ?? null,
                  name: d?.name ?? null,
                  pdf: d?.pdf ?? null,
                  audio: d?.audio ?? null,
                  numberOfWord: d?.numberOfWord ?? null,
                })) ?? [],
            },
          ];
          baseData.aptitude = aptitudeData;
          hasValidData = true;
        } else if (
          type === "speaking" &&
          item.speaking &&
          item.speaking.length > 0
        ) {
          const speakingData = [
            {
              individualQuestions: item?.aptitude?.individualQuestions ?? null,
              duration: item?.aptitude?.duration ?? null,
              marks: item?.aptitude?.marks ?? null,
              isTestComplete: sectionStatus,
              data: item.speaking,
            },
          ];
          baseData.speaking = speakingData;
          hasValidData = true;
        }

        // Only return tests that have valid data for the specified type
        return hasValidData ? baseData : null;
      })
      .filter((item) => item !== null); // Filter out tests that don't have valid data

    // Send the filtered and formatted response
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Get practice test by id for web
exports.practiceById = async (req, res) => {
  const { testId, type } = req.body;
  try {
    const test = await Test.findOne({ _id: testId });

    // Format the data
    const formattedData = {
      _id: test?._id,
      name: test?.name ?? null,
      // totalQuestion: test?.totalQuestion ?? null,
      // totalMarks: test?.totalMarks ?? null,
      // duration: test?.duration ?? null,
    };
    // Dynamically include the specified type field in the response
    if (type === "reading") {
      formattedData.type = "reading";
      formattedData.reading = {
        individualQuestions: test?.reading?.individualQuestions ?? null,
        duration: test?.reading?.duration ?? null,
        marks: test?.reading?.marks ?? null,
        question:
          test?.reading?.question?.map((q) => ({
            _id: q?._id ?? null,
            questionNumber: q?.questionNumber ?? null,
            type: q?.type ?? null,
          })) ?? [],
        data:
          test?.reading?.data?.map((d) => ({
            _id: d?._id ?? null,
            name: d?.name ?? null,
            pdf: d?.pdf ?? null,
            audio: d?.audio ?? null,
            numberOfWord: d?.numberOfWord ?? null,
          })) ?? [],
      };
    } else if (type === "writing") {
      formattedData.type = "writing";
      formattedData.writing = {
        individualQuestions: test?.writing?.individualQuestions ?? null,
        duration: test?.writing?.duration ?? null,
        marks: test?.writing?.marks ?? null,
        data:
          test?.writing?.data?.map((d) => ({
            _id: d?._id ?? null,
            name: d?.name ?? null,
            pdf: d?.pdf ?? null,
            audio: d?.audio ?? null,
            numberOfWord: d?.numberOfWord ?? null,
          })) ?? [],
      };
    } else if (type === "listening") {
      formattedData.type = "listening";
      formattedData.listening = {
        individualQuestions: test?.listening?.individualQuestions ?? null,
        duration: test?.listening?.duration ?? null,
        marks: test?.listening?.marks ?? null,
        question:
          test?.listening?.question?.map((q) => ({
            _id: q?._id ?? null,
            questionNumber: q?.questionNumber ?? null,
            type: q?.type ?? null,
          })) ?? [],
        data:
          test?.listening?.data?.map((d) => ({
            _id: d?._id ?? null,
            name: d?.name ?? null,
            pdf: d?.pdf ?? null,
            audio: d?.audio ?? null,
            numberOfWord: d?.numberOfWord ?? null,
          })) ?? [],
      };
    } else if (type === "aptitude") {
      formattedData.type = "aptitude";
      formattedData.aptitude = {
        individualQuestions: test?.aptitude?.individualQuestions ?? null,
        duration: test?.aptitude?.duration ?? null,
        marks: test?.aptitude?.marks ?? null,
        question:
          test?.aptitude?.question?.map((q) => ({
            _id: q?._id ?? null,
            questionNumber: q?.questionNumber ?? null,
            type: q?.type ?? null,
          })) ?? [],
        data:
          test?.aptitude?.data?.map((d) => ({
            _id: d?._id ?? null,
            name: d?.name ?? null,
            pdf: d?.pdf ?? null,
            audio: d?.audio ?? null,
            numberOfWord: d?.numberOfWord ?? null,
          })) ?? [],
      };
    } else if (type === "speaking") {
      formattedData.type = "speaking";
      formattedData.speaking = {
        individualQuestions: test?.speaking?.individualQuestions ?? null,
        duration: test?.speaking?.duration ?? null,
        marks: test?.speaking?.marks ?? null,
        data: test.speaking,
      };
      // formattedData.speaking = test.speaking;
    }
    sendResponse(res, 200, formattedData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Submit Practice Answer
exports.submitPracticeAnswer = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { testId, data, type } = req.body;

    // Find the test and associated MockTest data
    const test = await Test.findById(testId);
    const learningResource = await LearningResource.findById(test.parentId);
    const learningResourceId = learningResource?._id;
    const courseId = learningResource?.courseId;

    // Initialize unanswered count
    let unansweredCount = 0;

    const currentDateTime = new Date();
    // Add 5 hours and 30 minutes
    currentDateTime.setHours(currentDateTime.getHours() + 5);
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);

    // Format answers and check if unanswered
    const formattedAnswers = data.map(
      ({ questionNumber, questionType, answer }) => {
        // Ensure answer is treated as an array of strings
        const answerArray = Array.isArray(answer) ? answer : [answer];

        // Check if all answers are empty, i.e., unanswered
        const isUnanswered = answerArray.every((ans) => ans === "");

        // Increment unanswered count if the answer is empty
        if (isUnanswered) unansweredCount++;

        return {
          questionNumber,
          questionType,
          answers: answerArray, // Storing as array of strings
          correct: false,
          unanswered: isUnanswered,
          incorrect: false,
        };
      }
    );

    const formattedWritingAnswers = data.map(
      ({ passageNumber, answer }, index) => {
        // Retrieve the number of words from the Test model's writing data by index
        const writingDataFromTest = test.writing.data[index]; // Assuming passageNumber matches the index

        const numberOfWord = writingDataFromTest?.numberOfWord || 0; // Fallback to 0 if not found

        return {
          passageNumber,
          answers: answer, // Assuming answer is a string for the writing part
          numberOfWord, // Use the number of words from the Test model
        };
      }
    );

    // Prepare an update object based on test type
    let updateData = {};
    if (type === "reading") {
      updateData["reading.data"] = formattedAnswers;
      updateData["reading.unanswered"] = unansweredCount;
      updateData["reading.isTestComplete"] = "pending";
      updateData["reading.submitDateTime"] = currentDateTime;
      updateData["reading.totalMarks"] = test.reading.marks;
    } else if (type === "writing") {
      updateData["writing.data"] = formattedWritingAnswers;
      updateData["writing.isTestComplete"] = "pending";
      updateData["writing.submitDateTime"] = currentDateTime;
      updateData["writing.totalMarks"] = test.writing.marks;
    } else if (type === "listening") {
      updateData["listening.data"] = formattedAnswers;
      updateData["listening.unanswered"] = unansweredCount;
      updateData["listening.isTestComplete"] = "pending";
      updateData["listening.submitDateTime"] = currentDateTime;
      updateData["listening.totalMarks"] = test.listening.marks;
    } else if (type === "aptitude") {
      updateData["aptitude.data"] = formattedAnswers;
      updateData["aptitude.unanswered"] = unansweredCount;
      updateData["aptitude.isTestComplete"] = "pending";
      updateData["aptitude.submitDateTime"] = currentDateTime;
      updateData["aptitude.totalMarks"] = test.aptitude.marks;
    } else if (type === "speaking") {
      updateData["speaking.data"] = formattedAnswers;
      updateData["speaking.unanswered"] = unansweredCount;
      updateData["speaking.isTestComplete"] = "pending";
      updateData["speaking.submitDateTime"] = currentDateTime;
      updateData["speaking.totalMarks"] = test.aptitude.marks;
    } else {
      return sendResponse(res, 400, null, "Invalid test type");
    }

    // Find or create the UserTest entry for this user and test
    let userPractice = await UserPractice.findOne({
      userId,
      testId,
    });

    if (!userPractice) {
      // If no existing test, create a new entry
      userPractice = new UserPractice({
        userId,
        learningResourceId,
        testId,
        courseId,
      });
    }

    // Apply the updates to the relevant field
    userPractice.set(updateData);

    // Save the user test answers
    await userPractice.save();

    sendResponse(res, 200, userPractice, Messages.DATA_CREATED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Get Practice Submited Answer of each user (Admin)
exports.getUserPracticeAnswer = async (req, res) => {
  try {
    const { userId, testId, type } = req.body;

    // Find the user's test based on userId and testId
    const userPractice = await UserPractice.findOne({
      userId,
      testId,
    }).populate([
      { path: "userId", select: "username" },
      { path: "learningResourceId", select: "name" },
      { path: "testId", select: "name" },
      { path: "courseId", select: "title" },
    ]);

    // If no userTest found, send an empty response
    if (!userPractice) {
      return sendResponse(res, 400, null, "User Test not found");
    }

    // Base structure to store the response
    const baseData = {
      _id: userPractice._id,
      userId: userPractice?.userId?._id ?? null,
      userName: userPractice?.userId?.username ?? null,
      learningResourceId: userPractice?.learningResourceId?._id ?? null,
      learningResourceName: userPractice?.learningResourceId?.name ?? null,
      testId: userPractice?.testId?._id ?? null,
      testName: userPractice?.testId?.name ?? null,
      courseId: userPractice?.courseId?._id ?? null,
      courseName: userPractice?.courseId?.title ?? null,
      isTestChecked: userPractice?.isTestChecked,
      type: `${type}`,
    };

    // Add user test data dynamically based on the type provided
    let hasValidData = false;

    if (type === "reading") {
      const readingData =
        userPractice.reading?.data?.map((ele) => ({
          questionNumber: ele.questionNumber,
          questionType: ele.questionType,
          answers: ele.answers,
          correct: ele.correct,
          unanswered: ele.unanswered,
          incorrect: ele.incorrect,
          // totalMarks: ele.totalMarks,
        })) ?? [];

      if (readingData.length > 0) {
        baseData.reading = {
          data: readingData,
          totalCorrect: userPractice.reading.correct,
          totalUnanswered: userPractice.reading.unanswered,
          totalIncorrect: userPractice.reading.incorrect,
          totalMarks: userPractice.reading.totalMarks,
          obtainMarks: userPractice.reading.obtainMarks,
          facultyFeedback: userPractice.reading.facultyFeedback,
        };
        hasValidData = true;
      }
    } else if (type === "writing") {
      const writingData =
        userPractice.writing?.data?.map((ele) => ({
          passageNumber: ele.passageNumber ?? 0,
          answers: ele.answers ?? null,
          numberOfWord: ele.numberOfWord ?? 0,
          // totalMarks: ele.totalMarks,
        })) ?? [];

      if (writingData.length > 0) {
        baseData.writing = {
          data: writingData,
          totalMarks: userPractice.writing.totalMarks,
          obtainMarks: userPractice.writing.obtainMarks,
          facultyFeedback: userPractice.writing.facultyFeedback,
        };
        hasValidData = true;
      }
    } else if (type === "listening") {
      const listeningData =
        userPractice.listening?.data?.map((ele) => ({
          questionNumber: ele.questionNumber,
          questionType: ele.questionType,
          answers: ele.answers,
          correct: ele.correct,
          unanswered: ele.unanswered,
          incorrect: ele.incorrect,
          totalMarks: ele.totalMarks,
        })) ?? [];

      if (listeningData.length > 0) {
        baseData.listening = {
          data: listeningData,
          totalCorrect: userPractice.listening.correct,
          totalUnanswered: userPractice.listening.unanswered,
          totalIncorrect: userPractice.listening.incorrect,
          totalMarks: userPractice.listening.totalMarks,
          obtainMarks: userPractice.listening.obtainMarks,
          facultyFeedback: userPractice.listening.facultyFeedback,
        };
        hasValidData = true;
      }
    } else if (type === "aptitude") {
      const aptitudeData =
        userPractice.aptitude?.data?.map((ele) => ({
          questionNumber: ele.questionNumber,
          questionType: ele.questionType,
          answers: ele.answers,
          correct: ele.correct,
          unanswered: ele.unanswered,
          incorrect: ele.incorrect,
          totalMarks: ele.totalMarks,
        })) ?? [];

      if (aptitudeData.length > 0) {
        baseData.aptitude = {
          data: aptitudeData,
          totalCorrect: userPractice.aptitude.correct,
          totalUnanswered: userPractice.aptitude.unanswered,
          totalIncorrect: userPractice.aptitude.incorrect,
          totalMarks: userPractice.aptitude.totalMarks,
          obtainMarks: userPractice.aptitude.obtainMarks,
          facultyFeedback: userPractice.aptitude.facultyFeedback,
        };
        hasValidData = true;
      }
    } else if (type === "speaking") {
      // if (userPractice.speaking) {
      //   baseData.speaking = userPractice.speaking;
      //   hasValidData = true;
      // }

      if (userPractice.speaking) {
        baseData.speaking = {
          audioUrl: userPractice.speaking.audioUrl,
          facultyFeedback: userPractice.speaking.facultyFeedback,
          totalMarks: userPractice.speaking.totalMarks,
          obtainMarks: userPractice.speaking.obtainMarks,
        };
        hasValidData = true;
      }
    }

    // If no valid data is found, return 200
    if (!hasValidData) {
      return sendResponse(
        res,
        200,
        null,
        `No data found for the provided test type: ${type}`
      );
    }

    // Send the response with the formatted data
    sendResponse(res, 200, baseData, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

//Section - Admin check practice submitted answer (Admin)
exports.checkPracticeAnswer = async (req, res) => {
  try {
    const { testId, userId, data, type, obtainMarks, facultyFeedback } =
      req.body;

    // Find the user's test based on testId and userId
    const userPractice = await UserPractice.findOne({ testId, userId });

    // If no test is found, return an error
    if (!userPractice) {
      return sendResponse(res, 404, null, "User Test not found");
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;

    // Calculate totalCorrect, totalIncorrect, and totalMarks
    if (data) {
      data?.forEach((item) => {
        if (item.correct) {
          totalCorrect++;
          // totalMarks++; // Assuming each correct answer gives 1 mark
        } else if (item.incorrect) {
          totalIncorrect++;
        }
      });
    }

    // Update the correct type (reading, listening, etc.)
    if (type === "reading") {
      userPractice.reading.data = data; // Update reading data array
      userPractice.reading.correct = totalCorrect;
      userPractice.reading.incorrect = totalIncorrect;
      userPractice.reading.obtainMarks = obtainMarks;
      userPractice.reading.isTestComplete = "checked";
      userPractice.reading.facultyFeedback = facultyFeedback;
      userPractice.reading.checkerId = req?.meta?._id;
    } else if (type === "listening") {
      userPractice.listening.data = data; // Update listening data array
      userPractice.listening.correct = totalCorrect;
      userPractice.listening.incorrect = totalIncorrect;
      userPractice.listening.obtainMarks = obtainMarks;
      userPractice.listening.isTestComplete = "checked";
      userPractice.listening.facultyFeedback = facultyFeedback;
      userPractice.listening.checkerId = req?.meta?._id;
    } else if (type === "aptitude") {
      userPractice.aptitude.data = data; // Update aptitude data array
      userPractice.aptitude.totalCorrect = totalCorrect;
      userPractice.aptitude.totalIncorrect = totalIncorrect;
      userPractice.aptitude.obtainMarks = obtainMarks;
      userPractice.aptitude.isTestComplete = "checked";
      userPractice.aptitude.facultyFeedback = facultyFeedback;
      userPractice.aptitude.checkerId = req?.meta?._id;
    } else if (type === "writing") {
      // userPractice.writing.data = data;  // Update writing data array
      userPractice.writing.obtainMarks = obtainMarks;
      userPractice.writing.isTestComplete = "checked";
      userPractice.writing.facultyFeedback = facultyFeedback;
      userPractice.writing.checkerId = req?.meta?._id;
    } else if (type === "speaking") {
      userPractice.speaking.data = data; // Update speaking data array
      userPractice.speaking.correct = totalCorrect;
      userPractice.speaking.incorrect = totalIncorrect;
      userPractice.speaking.obtainMarks = obtainMarks;
      userPractice.speaking.isTestComplete = "checked";
      userPractice.speaking.facultyFeedback = facultyFeedback;
      userPractice.speaking.checkerId = req?.meta?._id;
    } else {
      return sendResponse(res, 400, null, "Invalid type provided");
    }

    // Save the updated test
    await userPractice.save();

    // Send a success response
    return sendResponse(res, 200, userPractice, Messages.ANSWERS_CHECKED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, error.message);
  }
};

//Section- Get Admin practice checked answer to user
exports.getUserPracticeCheckAnswer = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { testId, type } = req.body;
    const userPractice = await UserPractice.findOne({
      userId,
      testId,
    }).populate([
      { path: "userId", select: "username" },
      { path: "learningResourceId", select: "name" },
      { path: "testId", select: "name" },
      { path: "courseId", select: "title" },
      { path: `${type}.checkerId`, select: "name" },
    ]);
    // If no userTest found, send an empty response
    if (!userPractice) {
      return sendResponse(res, 400, null, "User Test not found");
    }

    // Base structure to store the response
    const baseData = {
      _id: userPractice._id,
      userId: userPractice?.userId?._id ?? null,
      userName: userPractice?.userId?.username ?? null,
      learningResourceId: userPractice?.learningResourceId?._id ?? null,
      learningResourceName: userPractice?.learningResourceId?.name ?? null,
      testId: userPractice?.testId?._id ?? null,
      testName: userPractice?.testId?.name ?? null,
      courseId: userPractice?.courseId?._id ?? null,
      courseName: userPractice?.courseId?.title ?? null,
      isTestChecked: userPractice?.isTestChecked,
      type: `${type}`,
    };

    // Add user test data dynamically based on the type provided
    let hasValidData = false;

    if (type === "reading") {
      const readingData =
        userPractice.reading?.data?.map((ele) => ({
          questionNumber: ele.questionNumber,
          questionType: ele.questionType,
          answer: ele.answers,
          correct: ele.correct,
          unanswered: ele.unanswered,
          incorrect: ele.incorrect,
          // totalMarks: ele.totalMarks,
        })) ?? [];

      if (readingData.length > 0) {
        baseData.reading = {
          data: readingData,
          checkerName: userPractice?.reading?.checkerId?.name ?? null,
          totalCorrect: userPractice.reading.correct ?? null,
          totalUnanswered: userPractice.reading.unanswered ?? null,
          totalIncorrect: userPractice.reading.incorrect ?? null,
          totalMarks: userPractice.reading.totalMarks ?? null,
          obtainMarks: userPractice.reading.obtainMarks ?? null,
          facultyFeedback: userPractice.reading.facultyFeedback ?? null,
        };
        hasValidData = true;
      }
    } else if (type === "writing") {
      const writingData =
        userPractice.writing?.data?.map((ele) => ({
          passageNumber: ele.passageNumber,
          answer: ele.answers,
          totalMarks: ele.totalMarks,
        })) ?? [];

      if (writingData.length > 0) {
        baseData.writing = {
          data: writingData,
          checkerName: userPractice?.writing?.checkerId?.name ?? null,
          totalMarks: userPractice.writing.totalMarks ?? null,
          obtainMarks: userPractice.writing.obtainMarks ?? null,
          facultyFeedback: userPractice.writing.facultyFeedback ?? null,
        };
        hasValidData = true;
      }
    } else if (type === "listening") {
      const listeningData =
        userPractice.listening?.data?.map((ele) => ({
          questionNumber: ele.questionNumber,
          questionType: ele.questionType,
          answer: ele.answers,
          correct: ele.correct,
          unanswered: ele.unanswered,
          incorrect: ele.incorrect,
          totalMarks: ele.totalMarks,
        })) ?? [];

      if (listeningData.length > 0) {
        baseData.listening = {
          data: listeningData,
          checkerName: userPractice?.listening?.checkerId?.name ?? null,
          totalCorrect: userPractice.listening.correct ?? null,
          totalUnanswered: userPractice.listening.unanswered ?? null,
          totalIncorrect: userPractice.listening.incorrect ?? null,
          totalMarks: userPractice.listening.totalMarks ?? null,
          obtainMarks: userPractice.listening.obtainMarks ?? null,
          facultyFeedback: userPractice.listening.facultyFeedback ?? null,
        };
        hasValidData = true;
      }
    } else if (type === "aptitude") {
      const aptitudeData =
        userPractice.aptitude?.data?.map((ele) => ({
          questionNumber: ele.questionNumber,
          questionType: ele.questionType,
          answer: ele.answers,
          correct: ele.correct,
          unanswered: ele.unanswered,
          incorrect: ele.incorrect,
          totalMarks: ele.totalMarks,
        })) ?? [];

      if (aptitudeData.length > 0) {
        baseData.aptitude = {
          data: aptitudeData,
          checkerName: userPractice?.aptitude?.checkerId?.name ?? null,
          totalCorrect: userPractice.aptitude.correct ?? null,
          totalUnanswered: userPractice.aptitude.unanswered ?? null,
          totalIncorrect: userPractice.aptitude.incorrect ?? null,
          totalMarks: userPractice.aptitude.totalMarks ?? null,
          obtainMarks: userPractice.aptitude.obtainMarks ?? null,
          facultyFeedback: userPractice.aptitude.facultyFeedback ?? null,
        };
        hasValidData = true;
      }
    } else if (type === "speaking") {
      if (userPractice.speaking) {
        baseData.speaking = userPractice.speaking;
        hasValidData = true;
      }
    }

    // If no valid data is found, return 200
    if (!hasValidData) {
      return sendResponse(
        res,
        200,
        null,
        `No data found for the provided test type: ${type}`
      );
    }
    // Send the response with the formatted data
    sendResponse(res, 200, baseData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Get mockTest marks to make graph (performance)
exports.practiceAssignmentGraph = async (req, res) => {
  try {
    const { id } = req.meta;
    const { planId } = req.query;

    // Step 1: Filter user product details based on user ID and optional plan ID
    const userProductFilter = { userId: id };
    if (planId) {
      userProductFilter.planId = planId;
    }

    const userProductDetails = await UserProductDetails.find(
      userProductFilter
    ).select("planId");
    const userPlanIds = userProductDetails.map((item) => item.planId);

    // Step 2: Find matching practice assignments based on userPlanIds
    const practiceAssignments = await PracticeAssignment.find({
      courseId: { $in: userPlanIds },
    }).select("_id");

    const practiceAssignmentIds = practiceAssignments.map((pa) => pa._id);

    // Step 3: Build the filter for UserPractice query to include only "checked" tests
    const filter = {
      userId: id,
      practiceAssignmentId: { $in: practiceAssignmentIds },
      $or: [
        { "reading.isTestComplete": "checked" },
        { "listening.isTestComplete": "checked" },
        { "aptitude.isTestComplete": "checked" },
        { "writing.isTestComplete": "checked" },
        { "speaking.isTestComplete": "checked" },
      ],
    };

    // Fetch user practice entries based on the filter
    const userPractices = await UserPractice.find(filter)
      .select({
        testId: 1,
        practiceAssignmentId: 1,
        userId: 1,
        reading: 1,
        writing: 1,
        listening: 1,
        aptitude: 1,
        speaking: 1,
      })
      .populate([
        { path: "testId", select: "name types" },
        { path: "practiceAssignmentId", select: "name" },
        { path: "userId", select: "username" },
      ]);

    // Step 4: Format the data based on available test types and ensure only checked tests are included
    const result = userPractices.map((item) => {
      const testTypes = item.testId.types;
      const filteredMarks = {};

      if (
        testTypes.includes("reading") &&
        item.reading?.isTestComplete === "checked"
      ) {
        filteredMarks.reading = {
          totalMarks: item.reading.totalMarks,
          obtainMarks: item.reading.obtainMarks,
          isTestComplete: item.reading.isTestComplete,
        };
      }
      if (
        testTypes.includes("writing") &&
        item.writing?.isTestComplete === "checked"
      ) {
        filteredMarks.writing = {
          totalMarks: item.writing.totalMarks,
          obtainMarks: item.writing.obtainMarks,
          isTestComplete: item.writing.isTestComplete,
        };
      }
      if (
        testTypes.includes("listening") &&
        item.listening?.isTestComplete === "checked"
      ) {
        filteredMarks.listening = {
          totalMarks: item.listening.totalMarks,
          obtainMarks: item.listening.obtainMarks,
          isTestComplete: item.listening.isTestComplete,
        };
      }
      if (
        testTypes.includes("aptitude") &&
        item.aptitude?.isTestComplete === "checked"
      ) {
        filteredMarks.aptitude = {
          totalMarks: item.aptitude.totalMarks,
          obtainMarks: item.aptitude.obtainMarks,
          isTestComplete: item.aptitude.isTestComplete,
        };
      }

      if (
        testTypes.includes("speaking") &&
        item.speaking?.isTestComplete === "checked"
      ) {
        filteredMarks.speaking = {
          totalMarks: item.speaking.totalMarks,
          obtainMarks: item.speaking.obtainMarks,
          isTestComplete: item.speaking.isTestComplete,
        };
      }

      return {
        testId: item?.testId?._id,
        testName: item?.testId?.name,
        practiceAssignmentId: item?.practiceAssignmentId?._id,
        practiceAssignmentName: item?.practiceAssignmentId?.name,
        userId: item?.userId?._id,
        userName: item?.userId?.username,
        marks: filteredMarks,
      };
    });

    sendResponse(res, 200, result, Messages.DATA_RETRIVED);
  } catch (error) {
    console.error(error);
    sendResponse(res, 400, null, error.message);
  }
};

//Section - Get how many practice assignment is given by user (performance)
exports.getUserPracticeAssignmentCount = async (req, res) => {
  try {
    const userId = req?.meta?._id;
    const { type, planId } = req.body;

    // Step 1: Build user product filter
    const userProductFilter = { userId };
    if (planId) {
      userProductFilter.planId = planId;
    }

    // Step 2: Get user's plan IDs
    const userProductDetails = await UserProductDetails.find(
      userProductFilter
    ).select("planId");
    const userPlanIds = userProductDetails.map((item) => item.planId);

    // Step 3: Find practice assignments linked to user's plan IDs
    const practiceAssignments = await PracticeAssignment.find({
      courseId: { $in: userPlanIds },
    }).select("_id");
    const practiceAssignmentIds = practiceAssignments.map((pa) => pa._id);

    // Step 4: Create query filter
    const queryFilter = {
      userId,
      practiceAssignmentId: { $in: practiceAssignmentIds },
      [`${type}.isTestComplete`]: "checked",
    };

    // Step 5: Fetch user's practice test data
    const userPractices = await UserPractice.find(queryFilter).populate([
      { path: "userId", select: "username" },
      { path: "practiceAssignmentId", select: "name createdAt" },

      {
        path: "testId",
        select: `name ${type}.individualQuestions ${type}.duration ${type}.marks`,
      },
      { path: "courseId", select: "title" },
      { path: `${type}.checkerId`, select: "name" },
    ]);

    // Step 6: If no data found
    if (!userPractices || userPractices.length === 0) {
      return sendResponse(
        res,
        200,
        [],
        "Sorry you don't have any test for this type"
      );
    }

    // Step 7: Prepare response data
    const responseData = userPractices.map((item) => {
      const baseData = {
        _id: item._id,
        userId: item.userId?._id ?? null,
        userName: item.userId?.username ?? null,
        mockTestId: item.practiceAssignmentId?._id ?? null,
        mockTestName: item.practiceAssignmentId?.name ?? null,
        mockTestDate: item.practiceAssignmentId?.createdAt
          ? new Date(item.practiceAssignmentId.createdAt).toLocaleDateString()
          : null,
        mockTestTime: item.practiceAssignmentId?.createdAt
          ? new Date(item.practiceAssignmentId.createdAt).toLocaleTimeString()
          : null,
        testId: item.testId?._id ?? null,
        testName: item.testId?.name ?? null,
        testTotalQuestions: item.testId?.[type]?.individualQuestions ?? null,
        testDuration: item.testId?.[type]?.duration ?? null,
        testMarks: item.testId?.[type]?.marks ?? null,
        courseId: item.courseId?._id ?? null,
        courseName: item.courseId?.title ?? null,
        isTestChecked: item.isTestChecked,
        type: type,
      };

      // Append data dynamically based on test type
      if (type === "reading" && item.reading?.data) {
        baseData.reading = {
          checkerName: item.reading?.checkerId?.name ?? null,
          totalCorrect: item.reading.correct ?? null,
          totalUnanswered: item.reading.unanswered ?? null,
          totalIncorrect: item.reading.incorrect ?? null,
          totalMarks: item.reading.totalMarks ?? null,
          obtainMarks: item.reading.obtainMarks ?? null,
          isTestComplete: item.reading.isTestComplete ?? null,
          facultyFeedback: item.reading.facultyFeedback ?? null,
        };
      } else if (type === "writing" && item.writing?.data) {
        baseData.writing = {
          checkerName: item.writing?.checkerId?.name ?? null,
          totalCorrect: item.writing.correct ?? null,
          totalUnanswered: item.writing.unanswered ?? null,
          totalIncorrect: item.writing.incorrect ?? null,
          totalMarks: item.writing.totalMarks ?? null,
          obtainMarks: item.writing.obtainMarks ?? null,
          isTestComplete: item.writing.isTestComplete ?? null,
          facultyFeedback: item.writing.facultyFeedback ?? null,
        };
      } else if (type === "listening" && item.listening?.data) {
        baseData.listening = {
          checkerName: item.listening?.checkerId?.name ?? null,
          totalCorrect: item.listening.correct ?? null,
          totalUnanswered: item.listening.unanswered ?? null,
          totalIncorrect: item.listening.incorrect ?? null,
          totalMarks: item.listening.totalMarks ?? null,
          obtainMarks: item.listening.obtainMarks ?? null,
          isTestComplete: item.listening.isTestComplete ?? null,
          facultyFeedback: item.listening.facultyFeedback ?? null,
        };
      } else if (type === "aptitude" && item.aptitude?.data) {
        baseData.aptitude = {
          checkerName: item.aptitude?.checkerId?.name ?? null,
          totalCorrect: item.aptitude.correct ?? null,
          totalUnanswered: item.aptitude.unanswered ?? null,
          totalIncorrect: item.aptitude.incorrect ?? null,
          totalMarks: item.aptitude.totalMarks ?? null,
          obtainMarks: item.aptitude.obtainMarks ?? null,
          isTestComplete: item.aptitude.isTestComplete ?? null,
          facultyFeedback: item.aptitude.facultyFeedback ?? null,
        };
      } else if (type === "speaking") {
        baseData.speaking = {
          checkerName: item.speaking?.checkerId?.name ?? null,
          totalCorrect: item.speaking.correct ?? null,
          totalUnanswered: item.speaking.unanswered ?? null,
          totalIncorrect: item.speaking.incorrect ?? null,
          totalMarks: item.speaking.totalMarks ?? null,
          obtainMarks: item.speaking.obtainMarks ?? null,
          isTestComplete: item.speaking.isTestComplete ?? null,
          facultyFeedback: item.speaking.facultyFeedback ?? null,
        };
      }

      return baseData;
    });

    // Step 8: Send response
    sendResponse(res, 200, responseData, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(
      res,
      500,
      null,
      "An error occurred while fetching practice test data"
    );
  }
};
