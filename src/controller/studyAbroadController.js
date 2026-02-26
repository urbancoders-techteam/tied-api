const Student = require("../model/studentModel");
const mongoose = require("mongoose");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");

const { getCurrentISTTime } = require("../helper/lib");
const StudentPersonalCounsellorLogs = require("../model/studentPersonalCounsellorLogs");
const ProfileBuilding = require("../model/profileBuilding");
const PsychometricTest = require("../model/psychometricTest");
const UniversitySortListing = require("../model/UniversitySortListing");
const StudentUniversitySortListing = require("../model/StudentUniversitySortListing");
const AdmissionService = require("../model/admissionService");
const PostEnrollmentSupport = require("../model/postEnrollmentSupport");

//SECTION: Controller to update the status for Psychometric test for study abroad

exports.updatePsychometricTestStatus = async (req, res) => {
  try {
    // Get the ID of the admin/user who is updating (from middleware)
    const updatedBy = req?.meta?._id;

    // Destructure the studentId and new status from request body
    const { studentId, status } = req.body;

    // Find the student by ID
    const student = await Student.findById(studentId);

    // If student not found, return a 404 error response
    if (!student) {
      return sendResponse(res, 404, null, "Student not found");
    }

    // ✅ Ensure nested structure exists before updating nested fields

    // If studyAbroadDetails doesn't exist, initialize it
    if (!student.studyAbroadDetails) {
      student.studyAbroadDetails = {};
    }

    // If personalizedMentoring doesn't exist, initialize it
    if (!student.studyAbroadDetails.personalizedMentoring) {
      student.studyAbroadDetails.personalizedMentoring = {};
    }

    // Set the psychometricTest fields
    student.studyAbroadDetails.personalizedMentoring.psychometricTest = status;
    student.studyAbroadDetails.personalizedMentoring.psychometricTestAssignDate =
      getCurrentISTTime();
    student.studyAbroadDetails.personalizedMentoring.psychometricTestUpdatedBy =
      updatedBy;

    // Save the updated student document
    await student.save();

    // Send success response
    sendResponse(res, 200, null, Messages.DATA_UPDATE);
  } catch (error) {
    // Handle any unexpected errors
    sendResponse(res, 400, null, error.message);
  }
};

// SECTION: get study abroad status update for (Personalized Mentoring, Career Mapping, Admission Service, Post Enrollment Support)

exports.getStatus = async (req, res) => {
  try {
    const studentID = req.meta._id;

    const student = await Student.findById(studentID);
    if (!student) {
      return sendResponse(res, 404, null, "Student not found");
    }

    // -------------------- PERSONALIZED MENTORING (25) --------------------
    const counsellingLogExists = await StudentPersonalCounsellorLogs.exists({
      studentId: studentID,
    });

    const profileBuildingExists = await ProfileBuilding.exists({
      createdBy: studentID,
    });

    const psychometricTestExists = await PsychometricTest.exists({
      studentId: studentID,
    });

    let pmScore = 0;
    if (counsellingLogExists) pmScore += 10;
    if (psychometricTestExists) pmScore += 5;
    if (profileBuildingExists) pmScore += 10;

    // -------------------- CAREER MAPPING (30) --------------------
    const studentShortlist = await StudentUniversitySortListing.find({
      studentId: studentID,
    });
    const universitySortListings = await UniversitySortListing.find({
      studentId: studentID,
    });

    let cmScore = 0;
    if (studentShortlist.length > 0) cmScore += 10; // Countries
    if (universitySortListings?.length > 0) cmScore += 10; // Courses
    if (studentShortlist.length > 0 && universitySortListings.length > 0)
      cmScore += 10;

    // -------------------- ADMISSION SERVICES (30) --------------------
    let testPrepCompleted = false;
    let lorSopEssayCompleted = true;
    let applicationCompleted = true;

    for (const listing of universitySortListings) {
      const service = await AdmissionService.findOne({
        sortlistId: listing._id,
      });
      if (!service) {
        lorSopEssayCompleted = false;
        applicationCompleted = false;
        break;
      }

      if (service.testPreparation?.status === "Completed")
        testPrepCompleted = true;

      const allEssaysPresent =
        service.SOP?.trim() && service.LOR?.trim() && service.ESSAYS?.trim();
      if (!allEssaysPresent) lorSopEssayCompleted = false;

      const fillingValid =
        service.fillingApplication?.offerReceived &&
        service.fillingApplication?.appliedDate &&
        service.fillingApplication?.appliedTime &&
        service.fillingApplication?.applicationAmount &&
        service.fillingApplication?.appliedVia?.trim();

      if (!fillingValid) applicationCompleted = false;
    }

    let asScore = 0;
    if (testPrepCompleted) asScore += 10;
    if (lorSopEssayCompleted) asScore += 10;
    if (applicationCompleted) asScore += 10;

    // admission service and scholarship true/false
    let admissionServicesCompleted = false;
    let scholarshipCompleted = false;

    for (const listing of universitySortListings) {
      const service = await AdmissionService.findOne({
        sortlistId: listing?._id,
      });

      if (!service) {
        admissionServicesCompleted = false;
        scholarshipCompleted = false;
        break;
      }

      const allEssaysPresent =
        service.SOP?.trim() && service.LOR?.trim() && service.ESSAYS?.trim();

      if (!allEssaysPresent) {
        admissionServicesCompleted = false;
      }

      const scholarshipValid =
        service.scholarshipApplication?.offerReceived &&
        service.scholarshipApplication?.receivedDate &&
        service.scholarshipApplication?.receivedTime &&
        typeof service.scholarshipApplication?.file === "string" &&
        service.scholarshipApplication.file.trim() !== "";

      const fillingValid =
        service.fillingApplication?.offerReceived &&
        service.fillingApplication?.appliedDate &&
        service.fillingApplication?.appliedTime &&
        service.fillingApplication?.applicationAmount &&
        typeof service.fillingApplication?.appliedVia === "string" &&
        service.fillingApplication.appliedVia.trim() !== "";

      if (!scholarshipValid || !fillingValid) {
        scholarshipCompleted = false;
      }

      if (!admissionServicesCompleted && !scholarshipCompleted) {
        break;
      }
    }

    // -------------------- POST ENROLLMENT SUPPORT (15) --------------------
    const postEnrollment = await PostEnrollmentSupport.findOne({
      studentId: studentID,
    });

    let educationLoanSupport = false;
    let visaSupportAndTravel = false;
    let accommodationSupport = false;

    if (postEnrollment) {
      educationLoanSupport =
        postEnrollment.educationLoanSupport?.opted &&
        postEnrollment.educationLoanSupport?.status === "Completed";

      const visaCompleted =
        postEnrollment.visaSupport?.opted &&
        postEnrollment.visaSupport?.status === "Completed";

      const travelCompleted =
        postEnrollment.travelAndForexSupport?.opted &&
        postEnrollment.travelAndForexSupport?.status === "Completed";

      visaSupportAndTravel = visaCompleted && travelCompleted;

      accommodationSupport =
        postEnrollment.accommodationSupport?.opted &&
        postEnrollment.accommodationSupport?.status === "Completed";
    }

    let pesScore = 0;
    if (educationLoanSupport) pesScore += 5;
    if (visaSupportAndTravel) pesScore += 5;
    if (accommodationSupport) pesScore += 5;

    // -------------------- CHART PROGRESS (UPDATED) --------------------

    // Cumulative calculations
    const pmTotal = pmScore;
    const cmTotal = pmTotal + cmScore;
    const asTotal = cmTotal + asScore;
    const pesTotal = asTotal + pesScore;

    const chartData = [
      { name: "Start", progress: 0, status: true },

      {
        name: "Personalized Mentoring",
        progress: pmTotal,
        status: pmScore === 25,
      },

      { name: "Career Mapping", progress: cmTotal, status: cmScore === 30 },

      { name: "Admission Service", progress: asTotal, status: asScore === 30 },

      { name: "Enrollment Form", progress: pesTotal, status: pesScore === 15 },
    ];

    return sendResponse(
      res,
      200,
      {
        personalisedMentoringScore: pmScore,
        careerMappingScore: cmScore,
        admissionServicesScore: asScore,
        postEnrollmentScore: pesScore,

        totalScore: pesTotal,
        chart: pesTotal,
        chartData,

        counselling: !!counsellingLogExists,
        profileBuilding: !!profileBuildingExists,
        psychometric: !!psychometricTestExists,

        career:
          studentShortlist?.length > 0 && universitySortListings?.length > 0,

        testPreparation: false,
        admissionServices: admissionServicesCompleted,
        scholarship: scholarshipCompleted,

        testPrepCompleted,
        lorSopEssayCompleted,
        applicationCompleted,
        educationLoanSupport,
        accommodationSupport,
        visaSupportAndTravel,
      },
      "Success"
    );
  } catch (error) {
    console.error(error);
    return sendResponse(res, 400, null, error.message);
  }
};

// exports.getStatus = async (req, res) => {
//   try {
//     const studentID = req.meta._id;

//     const student = await Student.findById(studentID);
//     if (!student) {
//       return sendResponse(res, 404, null, "Student not found");
//     }

//     const counsellingLogExists = await StudentPersonalCounsellorLogs.exists({
//       studentId: studentID,
//     });
//     const profileBuildingExists = await ProfileBuilding.exists({
//       createdBy: studentID,
//     });
//     const psychometricTestExists = await PsychometricTest.exists({
//       studentId: studentID,
//     });

//     const studentShortlist = await StudentUniversitySortListing.find({
//       studentId: studentID,
//     });
//     const universitySortListings = await UniversitySortListing.find({
//       studentId: studentID,
//     });

//     let admissionServicesCompleted = true;
//     let scholarshipCompleted = true;

//     for (const listing of universitySortListings) {
//       const service = await AdmissionService.findOne({
//         sortlistId: listing._id,
//       });

//       if (!service) {
//         admissionServicesCompleted = false;
//         scholarshipCompleted = false;
//         break;
//       }

//       const allEssaysPresent =
//         service.SOP?.trim() && service.LOR?.trim() && service.ESSAYS?.trim();

//       if (!allEssaysPresent) {
//         admissionServicesCompleted = false;
//       }

//       const scholarshipValid =
//         service.scholarshipApplication?.offerReceived &&
//         service.scholarshipApplication?.receivedDate &&
//         service.scholarshipApplication?.receivedTime &&
//         typeof service.scholarshipApplication?.file === "string" &&
//         service.scholarshipApplication.file.trim() !== "";

//       const fillingValid =
//         service.fillingApplication?.offerReceived &&
//         service.fillingApplication?.appliedDate &&
//         service.fillingApplication?.appliedTime &&
//         service.fillingApplication?.applicationAmount &&
//         typeof service.fillingApplication?.appliedVia === "string" &&
//         service.fillingApplication.appliedVia.trim() !== "";

//       if (!scholarshipValid || !fillingValid) {
//         scholarshipCompleted = false;
//       }

//       if (!admissionServicesCompleted && !scholarshipCompleted) {
//         break;
//       }
//     }

//     // Post Enrollment Support
//     const postEnrollment = await PostEnrollmentSupport.findOne({
//       studentId: studentID,
//     });

//     let educationLoanSupport = false;
//     let accommodationSupport = false;
//     let visaSupportAndTravel = false;

//     if (postEnrollment) {
//       // True only when opted is true AND status is 'Completed'
//       educationLoanSupport =
//         postEnrollment.educationLoanSupport?.opted === true &&
//         postEnrollment.educationLoanSupport?.status === "Completed";

//       accommodationSupport =
//         postEnrollment.accommodationSupport?.opted === true &&
//         postEnrollment.accommodationSupport?.status === "Completed";

//       // For visa + travel, require BOTH to be opted and completed
//       const visaCompleted =
//         postEnrollment.visaSupport?.opted === true &&
//         postEnrollment.visaSupport?.status === "Completed";

//       const travelCompleted =
//         postEnrollment.travelAndForexSupport?.opted === true &&
//         postEnrollment.travelAndForexSupport?.status === "Completed";

//       visaSupportAndTravel = visaCompleted && travelCompleted;
//     }

//     // Calculate chart progress
//     let chart = 0;
//     if (profileBuildingExists) chart = 20;
//     if (studentShortlist.length > 0 && universitySortListings.length > 0)
//       chart = 40;
//     if (admissionServicesCompleted) chart = 80;
//     if (educationLoanSupport || accommodationSupport || visaSupportAndTravel)
//       chart = 100;

//     const result = {
//       counselling: !!counsellingLogExists,
//       profileBuilding: !!profileBuildingExists,
//       psychometric: !!psychometricTestExists,
//       career: studentShortlist.length > 0 && universitySortListings.length > 0,
//       testPreparation: false,
//       admissionServices: admissionServicesCompleted,
//       scholarship: scholarshipCompleted,
//       educationLoanSupport,
//       accommodationSupport,
//       visaSupportAndTravel,
//       chart,
//       chartData: [
//         {
//           name: "0",
//           progress: 0,
//           status: true,
//         },

//         {
//           name: "Profile Building",
//           progress: 20,
//           status: !!profileBuildingExists,
//         },
//         {
//           name: "Career Sorting",
//           progress: 40,
//           status:
//             studentShortlist.length > 0 && universitySortListings.length > 0,
//         },
//         {
//           name: "Admission Process",
//           progress: 80,
//           status: admissionServicesCompleted,
//         },
//         {
//           name: "Enrollment Form",
//           progress: 100,
//           status:
//             educationLoanSupport ||
//             accommodationSupport ||
//             visaSupportAndTravel,
//         },
//       ],
//     };

//     return sendResponse(res, 200, result, "Success");
//   } catch (error) {
//     console.error(error);
//     return sendResponse(res, 400, null, error.message);
//   }
// };
