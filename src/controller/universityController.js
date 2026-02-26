const ExcelJS = require("exceljs");
const xlsx = require("xlsx");
const { Parser } = require("json2csv");

const University = require("../model/university");
const UniversityFinder = require("../model/universityFinderForm");
const UniversityFinderLead = require("../model/universityFinderLeads");
const CountryModel = require("../model/country");
const CourseModel = require("../model/fieldOfInterest");
const BulkUpload = require("../model/bulkUpload");

const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const {
  uploadRawFileToS3,
  pushToS3Bucket,
  getSignedUrl,
} = require("../helper/uploadToS3");
const { getFutureDateTime } = require("../helper/lib");
const { default: mongoose } = require("mongoose");
const FieldOfInterest = require("../model/fieldOfInterest");

//Filter for University
exports.universityFilter = async (req, res) => {
  try {
    const id = req.meta?.id;
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const {
      countryId,
      pursue,
      year,
      duration,
      intake,
      courses,
      tutionFee,
      admissionRequirement,
      scholarAvailability,
      language,
      highestQualification,
      type,
    } = req.body;

    if (type === "submit") {
      await UniversityFinderLead.create({
        ...req.body,
        createdBy: id ? id : null,
        createdAt: getFutureDateTime(),
        updatedAt: getFutureDateTime(),
      });
    }
    const filter = {};
    const formattedFilter = {};

    // Handle countryId as a single value or array
    if (countryId && countryId.length > 0) {
      if (Array.isArray(countryId) && countryId.length > 0) {
        filter.countryId = { $in: countryId }; // Filter by multiple countryIds if passed as an array
      } else {
        filter.countryId = countryId; // Filter by single countryId if passed as a single value
      }
      formattedFilter.countryId = countryId;
    }

    if (pursue && pursue.length > 0) {
      filter.pursue = { $in: pursue };
      formattedFilter.pursue = pursue;
    }
    if (year && year.length > 0) {
      const yearNumber = parseInt(year[0], 10); // Convert the first year to a number for comparison

      // Filter universities whose `year` array contains years <= the given year
      filter.year = { $elemMatch: { $lte: yearNumber } };
      formattedFilter.year = year;
    }
    if (duration && duration.length > 0) {
      filter.duration = { $in: duration };
      formattedFilter.duration = duration;
    }
    if (intake && intake.length > 0) {
      filter.intake = { $in: intake };
      formattedFilter.intake = intake;
    }

    // Courses: Support both single values and comma-separated strings with regex search
    if (courses && courses != "") {
      let courseArray = Array.isArray(courses)
        ? courses
        : courses.split(",").map((c) => c.trim());

      filter.courses = {
        $in: courseArray.map((course) => new RegExp(course, "i")),
      };
      formattedFilter.courses = courseArray;
    }

    if (tutionFee) {
      filter.tutionFee = { $lte: tutionFee };
      formattedFilter.tutionFee = tutionFee;
    }
    if (admissionRequirement && admissionRequirement.length > 0) {
      if (
        Array.isArray(admissionRequirement) &&
        admissionRequirement.length > 0
      ) {
        filter.admissionRequirement = { $in: admissionRequirement };
        formattedFilter.admissionRequirement = admissionRequirement;
      } else {
        formattedFilter.admissionRequirement = admissionRequirement;
        formattedFilter.admissionRequirement = admissionRequirement;
      }
    }
    if (scholarAvailability) {
      filter.scholarAvailability = scholarAvailability;
      formattedFilter.scholarAvailability = scholarAvailability;
    }
    if (language) {
      if (language === "English") {
        filter.language = "English";
        formattedFilter.language = "English"; // Cleaner response
      } else if (language === "Other") {
        filter.language = { $ne: "English" };
        formattedFilter.language = "Other"; // Display "Other" instead of $ne
      }
    }
    if (highestQualification) {
      filter.highestQualification = { $in: highestQualification };
      formattedFilter.highestQualification = highestQualification;
    }

    const count = await University.countDocuments(filter);
    const data = await University.find(filter)
      .populate([
        { path: "countryId", select: "name icon" },
        { path: "courses", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();

    // collect all possible course values
    const allCourseIds = [
      ...new Set(
        data.flatMap(
          (ele) => ele.courses?.map((c) => c?._id?.toString?.() || c) || []
        )
      ),
    ];

    const coursesMap = {};
    if (allCourseIds.length) {
      const coursesData = await FieldOfInterest.find({
        _id: { $in: allCourseIds },
      }).lean();

      coursesData.forEach((c) => {
        coursesMap[c._id.toString()] = { _id: c._id, name: c.name };
      });
    }
    let formattedData = data.map((ele) => ({
      _id: ele?._id,
      courses: (ele?.courses || []).map((course) => {
        const key = course?._id?.toString?.() || course?.toString?.();
        return coursesMap[key] || { _id: key, name: null };
      }),
      countryId: ele?.countryId?._id ?? null,
      countryName: ele?.countryId?.name ?? null,
      intake: ele?.intake ?? null,
      duration: ele?.duration ?? null,
      tutionFee: ele?.tutionFee ?? null,
      currency: ele?.currency ?? null,
      highestQualification: ele?.highestQualification ?? null,
      admissionRequirement: ele?.admissionRequirement ?? null,
      scholarAvailability: ele?.scholarAvailability ?? null,
      webLink: ele?.webLink ?? null,
      universityName: ele?.name ?? null,
      image: ele?.image ?? null,
      rating: ele?.rating ?? null,
      qsRanking: ele?.qsRanking ?? null,
      language: ele?.language ?? null,
    }));
    // Sort by qsRanking first, then by rating for those without qsRanking
    formattedData.sort((a, b) => {
      if (a.qsRanking && b.qsRanking) {
        return a.qsRanking - b.qsRanking;
      } else if (!a.qsRanking && b.qsRanking) {
        return 1; // Move a down if it doesn't have qsRanking
      } else if (a.qsRanking && !b.qsRanking) {
        return -1; // Move b down if it doesn't have qsRanking
      } else {
        return (b.rating || 0) - (a.rating || 0); // Sort by rating descending
      }
    });

    // Limit the data to top 3 entries
    if (Object.keys(filter).length > 0) {
      formattedData = formattedData.slice(0, 10); // limit only when filters applied
    }

    // Send formatted filter data for a cleaner response
    sendResponse(
      res,
      200,
      {
        filterData: formattedFilter,
        count,
        data: formattedData,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
      Messages.DATA_RETRIVED
    );
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//Download CSV file Multiple and Single
exports.universityExcel = async (req, res) => {
  try {
    const ids = req.query.ids.split(","); // Expecting an array of university IDs

    // Fetch the universities based on the provided IDs
    const universities = await University.find({ _id: { $in: ids } })
      .populate("countryId", "name")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .lean(); // Use lean() for better performance

    if (!universities.length) {
      return sendResponse(
        res,
        400,
        null,
        "No universities found for the provided IDs"
      );
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Universities");

    // Define header row with styling
    const headers = [
      "Name",
      "Country",
      "Pursue",
      "Year",
      "Intake",
      "Duration",
      "Courses",
      "TutionFee",
      "AdmissionRequirement",
      "HighestQualification",
      "ScholarAvailability",
      "Language",
      "QSRanking",
      "WebLink",
    ];

    worksheet.addRow(headers);

    // Apply styling to headers
    const headerRow = worksheet.getRow(1);
    headerRow.height = 40; // Set row height for headers

    // Apply styling to headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "00999E" }, // HEX color converted to ARGB
      };
      cell.font = { bold: 500, color: { argb: "FFFFFF" } }; // White text color
      cell.alignment = { horizontal: "center", vertical: "middle" }; // Center alignment
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.padding = { top: 10, bottom: 10, left: 10, right: 10 }; // Increase padding from all sides
    });

    // Adjust column widths for better spacing
    worksheet.columns = headers.map(() => ({ width: 20, height: 30 }));

    // Format the data for Excel
    universities.forEach((university) => {
      const row = worksheet.addRow([
        university?.name ?? null,
        university?.countryId?.name ?? null,
        Array.isArray(university?.pursue)
          ? university.pursue.join("\n")
          : university?.pursue ?? null,
        Array.isArray(university?.year)
          ? university.year.join("\n")
          : university?.year ?? null,
        Array.isArray(university?.intake)
          ? university.intake.join("\n")
          : university?.intake ?? null,
        Array.isArray(university?.duration)
          ? university.duration.join("\n")
          : university?.duration ?? null,
        Array.isArray(university?.courses)
          ? university.courses.join("\n")
          : university?.courses ?? null,
        university?.currency
          ? `${university.currency}${university?.tutionFee ?? ""}`
          : university?.tutionFee ?? null,
        Array.isArray(university?.admissionRequirement)
          ? university.admissionRequirement.join("\n")
          : university?.admissionRequirement ?? null,
        university?.highestQualification ?? null,
        university?.scholarAvailability ?? null,
        university?.language ?? null,
        university?.qsRanking ?? null,
        university?.webLink ?? null,
      ]);

      // Apply text wrapping, spacing, and border for each cell in the row
      row.eachCell((cell) => {
        cell.alignment = {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        };
        cell.padding = { top: 10, bottom: 10, left: 10, right: 10 };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=universities.xlsx"
    );

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

// University comparsion
exports.universityComparsion = async (req, res) => {
  try {
    const { ids } = req.body;

    // Validate request
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid request. 'ids' must be a non-empty array.",
        data: null,
      });
    }

    // Convert ids → agar valid ObjectId hai to convert karo
    const objectIds = ids.map((id) => {
      const cleanId = id?.toString().trim();
      if (mongoose.Types.ObjectId.isValid(cleanId)) {
        return new mongoose.Types.ObjectId(cleanId);
      }
      return cleanId;
    });

    // Fetch universities
    const universities = await University.find({ _id: { $in: objectIds } })
      .populate("countryId", "name")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .lean();

    if (!universities || universities.length === 0) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "No universities found for given ids",
        data: null,
      });
    }

    // Collect all course IDs
    const allCourseIds = [
      ...new Set(
        universities.flatMap((u) =>
          (u.courses || []).filter((c) => mongoose.Types.ObjectId.isValid(c))
        )
      ),
    ];

    // Map course IDs to names
    const coursesMap = {};
    if (allCourseIds.length) {
      const coursesData = await FieldOfInterest.find({
        _id: { $in: allCourseIds },
      }).lean();
      coursesData.forEach((c) => {
        coursesMap[c._id.toString()] = c.name;
      });
    }

    // Format response
    const formattedData = universities.map((university) => ({
      _id: university?._id,
      universityName: university?.name,
      universityImage: university?.image,
      countryId: university?.countryId?._id,
      countryName: university?.countryId?.name,
      Intake: university?.intake ?? null,
      courses: (university?.courses || []).map(
        (id) => coursesMap[id?.toString()] || id
      ),
      TutionFee: university?.tutionFee ?? null,
      Currency: university?.currency ?? null,
      Language: university?.language ?? null,
      QSRanking: university?.qsRanking ?? null,
      duration: university?.duration?.length
        ? university.duration.join(", ")
        : null,
      webLink: university?.webLink ?? null,
    }));

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Universities data retrieved successfully",
      data: formattedData,
    });
  } catch (error) {
    console.error("universityComparsion error:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal server problem",
      data: null,
    });
  }
};

//Bulk upload for university
exports.universityUpload = async (req, res) => {
  try {
    const file = req.file;
    const createdBy = req?.meta?._id;
    if (!file) {
      return sendResponse(res, 400, null, "No file provided");
    }
    const originalFile = await uploadRawFileToS3(
      file.buffer,
      file.originalname,
      "originalFiles"
    );
    sendResponse(res, 200, null, "Please wait while data uploading");
    const workbook = xlsx.read(file.buffer, { type: "buffer" });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file has no sheets",
        data: null,
      });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: "First sheet is empty or not found",
        data: null,
      });
    }

    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sheet is empty or contains no rows",
        data: null,
      });
    }

    let successArray = [];
    let errorArray = [];
    let totalSuccess = 0;
    let totalFailure = 0;

    const validEnums = {
      pursue: ["Undergraduate", "Graduate", "PHD", "Certificate Program"],
      intake: [
        "Current Dec - Mar",
        "Apr - Jul",
        "Aug - Nov",
        "Upcoming Dec - Mar",
      ],
      duration: [
        "less than 1 Year",
        "1-2 year",
        "3-4 year",
        "more than 4 year",
      ],
      admissionRequirement: [
        "GRE/GMAT",
        "DUOLINGO",
        "SAT",
        "IELTS",
        "TOEFL",
        "PTE",
        "EXEMPT",
      ],
      highestQualification: [
        "Higher Secondary",
        "Undergraduate",
        "Graduate",
        "Certificate Program",
      ],
      scholarAvailability: [
        "Full Scholarships",
        "Partial Scholarships",
        "No Scholarships",
      ],
    };

    const createErrorRow = (row, reason) => ({
      ...(row || {}),
      reason: reason || "",
    });

    //Adjust time according to current time
    const timeDate = new Date();
    timeDate.setHours(timeDate.getHours() + 5);
    timeDate.setMinutes(timeDate.getMinutes() + 30);

    for (const row of jsonData) {
      let reason = "";
      let uploaded = "yes";

      if (!row || typeof row !== "object") {
        errorArray.push(createErrorRow({}, "Row data is invalid or empty"));
        totalFailure++;
        continue;
      }

      // Validate country
      const country = await CountryModel.findOne({
        name: { $regex: new RegExp(`^${row.countryName}$`, "i") },
      });

      if (!country) {
        reason += `Country "${row.countryName}" not found. `;
        uploaded = "no";
      }

      // Validate courses
      const courses = row.courses ? row.courses.split(",") : [];
      const courseIds = await Promise.all(
        courses.map(async (courseName) => {
          const existingCourse = await CourseModel.findOne({
            name: courseName,
          });
          let newCourse;
          if (!existingCourse) {
            newCourse = await CourseModel.create({
              name: courseName,
              createdBy,
              createdAt: timeDate.toISOString(),
            });
          }
          return existingCourse ? existingCourse._id : newCourse._id;
        })
      );

      // Process and validate enum fields
      row.pursue = row.pursue
        ? row.pursue
            .split(",")
            .map((v) => v.trim())
            .filter((value) => validEnums.pursue.includes(value))
        : [];

      row.intake = row.intake
        ? row.intake
            .split(",")
            .map((v) => v.trim())
            .filter((value) => validEnums.intake.includes(value))
        : [];

      row.duration = row.duration
        ? row.duration
            .split(",")
            .map((v) => v.trim())
            .filter((value) => validEnums.duration.includes(value))
        : [];

      row.admissionRequirement = row.admissionRequirement
        ? row.admissionRequirement
            .split(",")
            .map((v) => v.trim())
            .filter((value) => validEnums.admissionRequirement.includes(value))
        : [];
      row.courses = courseIds;

      row.year = row.year
        ? String(row.year)
            .split(",")
            .map((year) => year.trim())
        : [];

      if (uploaded === "no") {
        errorArray.push(createErrorRow(row, reason.trim()));

        totalFailure++;
        continue;
      }

      successArray.push({
        ...row,
        uploaded: "yes",
        reason: null,
      });
      totalSuccess++;
      await University.create({
        name: row.name,
        countryId: country._id,
        pursue: row.pursue ?? null,
        year: row.year ?? null,
        intake: row.intake ?? null,
        duration: row.duration ?? null,
        courses: row.courses,
        tutionFee: row.tutionFee ?? 0,
        currency: row.currency ?? null,
        admissionRequirement: row.admissionRequirement ?? null,
        highestQualification: row.highestQualification ?? null,
        scholarAvailability: row.scholarAvailability ?? null,
        language: row.language ?? null,
        rating: row.rating ?? null,
        webLink: row.webLink ?? null,
        qsRanking: row.qsRanking ?? null,
        image: row.image ?? null,
        createdBy: req?.meta?._id,
        createdAt: timeDate.toISOString(),
      });
    }

    // Upload success and error files to S3
    const successFile = await pushToS3Bucket(successArray, "successFiles");
    const errorFile = await pushToS3Bucket(errorArray, "errorFiles");

    // Log bulk upload details
    await BulkUpload.create({
      originalFile,
      successFile,
      errorFile,
      createdAt: timeDate.toISOString(),
      createdBy: req?.meta?._id,
    });

    return res.status(200).json({
      success: true,
      message: `University bulk upload completed. ${totalSuccess} record(s) uploaded successfully, ${totalFailure} failed.`,
      data: {
        totalSuccess,
        totalFailure,
        successFileUrl: successFile,
        errorFileUrl: errorFile,
      },
    });
  } catch (error) {
    console.error("Bulk Upload Error:", error.message, error.stack);

    return res.status(500).json({
      success: false,
      message:
        "Bulk upload failed. Please check your file format and try again.",
      data: null,
    });
  }
};

//BulkUpload list
exports.bulkUploadedList = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);
    const count = await BulkUpload.countDocuments();
    const data = await BulkUpload.find()

      .populate([{ path: "createdBy", select: "name" }])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean()
      .exec();

    const formattedData = await Promise.all(
      data.map(async (item) => {
        const originalFileKey = item.originalFile || null;
        const successFileKey = item.successFile || null;
        const errorFileKey = item.errorFile || null;
        return {
          originalFile: originalFileKey
            ? await getSignedUrl(originalFileKey)
            : null,
          successFile: successFileKey
            ? await getSignedUrl(successFileKey)
            : null,
          errorFile: errorFileKey ? await getSignedUrl(errorFileKey) : null,
          createdBy: item?.createdBy?.name ?? null,
          createdAt: item?.createdAt ?? null,
        };
      })
    );
    sendResponse(res, 200, { count, formattedData }, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//University finder form
exports.universityFinderForm = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const user = await UniversityFinder.findOne({
      $or: [{ email: email }, { phone: phone }],
    });
    const formFillTime = new Date();
    formFillTime.setHours(formFillTime.getHours() + 5);
    formFillTime.setMinutes(formFillTime.getMinutes() + 30);

    if (user) {
      return sendResponse(res, 400, null, Messages.MOBILE_EMAIL_EXISTS);
    }
    await UniversityFinder.create({
      name,
      phone,
      email,
      createdAt: formFillTime,
    });
    sendResponse(res, 200, null, Messages.FORM_SUBMIT);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//University finder lead get
exports.universityFinderLead = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    //add startDate and endDate filter
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        let endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // Set end date to the end of the day
        filter.createdAt.$lte = endDateObj;
      }
    }

    const result = await UniversityFinderLead.find(filter)
      .populate([{ path: "countryId", select: "name" }])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const count = await UniversityFinderLead.countDocuments(filter);
    const data = result?.map((item) => ({
      _id: item?._id ?? null,
      name: item?.name ?? null,
      email: item?.email ?? null,
      phone: item?.phone ?? null,
      country: item?.countryId?.map((c) => c.name).join(", ") ?? null,
      courses: item?.courses ?? null,
      pursue: item?.pursue ?? null,
      year: item?.year?.join(", ") ?? null,
      tuitionFee: item?.tutionFee ?? 0,
      duration: item?.duration?.join(", ") ?? null,
      intake: item?.intake?.join(", ") ?? null,
      admissionRequirement: item?.admissionRequirement?.join(", ") ?? null,
      scholarAvailability: item?.scholarAvailability?.join(", ") ?? null,
      highestQualification: item?.highestQualification ?? null,
      language: item?.language ?? null,
      rating: item?.rating ?? 0,
      type: item?.type ?? "Submit",
      status: item?.status ?? true,
      createdBy: item?.createdBy ?? null,
      createdAt: item?.createdAt ?? null,
    }));

    sendResponse(res, 200, { data, count }, Messages.DATA_RETRIVED);
  } catch (error) {
    return res.status(400).json(error.message);
  }
};

exports.universityFinderLeadCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        let endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateObj;
      }
    }

    const result = await UniversityFinderLead.find(filter)
      .populate("countryId", "name")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .lean();

    const csvData = result.map((university) => ({
      Name: university?.name || "-",
      Email: university?.email || "-",
      Phone: university?.phone || "-",
      Country:
        Array.isArray(university.countryId) && university.countryId.length > 0
          ? university.countryId.map((c) => c.name).join(", ")
          : "-",
      Pursue:
        Array.isArray(university?.pursue) && university.pursue.length > 0
          ? university.pursue.join(", ")
          : "-",
      Year:
        Array.isArray(university?.year) && university.year.length > 0
          ? university.year.join(", ")
          : "-",
      Intake:
        Array.isArray(university?.intake) && university.intake.length > 0
          ? university.intake.join(", ")
          : "-",
      Duration:
        Array.isArray(university?.duration) && university.duration.length > 0
          ? university.duration.join(", ")
          : "-",
      Courses: university?.courses || "-",
      TutionFee: university?.tutionFee?.toString() || "-",
      AdmissionRequirement:
        Array.isArray(university?.admissionRequirement) &&
        university.admissionRequirement.length > 0
          ? university.admissionRequirement.join(", ")
          : "-",
      ScholarAvailability:
        Array.isArray(university?.scholarAvailability) &&
        university.scholarAvailability.length > 0
          ? university.scholarAvailability.join(", ")
          : "-",
      HighestQualification: university?.highestQualification || "-",
    }));

    const fields = [
      "Name",
      "Email",
      "Phone",
      "Country",
      "Pursue",
      "Year",
      "Intake",
      "Duration",
      "Courses",
      "TutionFee",
      "AdmissionRequirement",
      "ScholarAvailability",
      "HighestQualification",
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=university_leads.csv"
    );
    res.setHeader("Content-Type", "text/csv");
    res.status(200).send(csv);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

exports.listUniqueUniversity = async (req, res) => {
  try {
    const { page, limit, countryId } = req.query;
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const parsedLimit = limit ? parseInt(limit) : null;

    if (!mongoose.isValidObjectId(countryId)) {
      return sendResponse(res, 400, null, Messages.INVALID_ID);
    }

    const countryExist = await CountryModel.findById(countryId);
    if (!countryExist) {
      return sendResponse(res, 400, null, Messages.COUNTRY_NOT_FOUND);
    }

    const filter = {};
    if (countryId) {
      filter.countryId = countryId;
    }

    const data = await University.find(filter)
      .populate([
        { path: "countryId", select: "name icon" },
        { path: "createdBy", select: "name" },
        { path: "updatedBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    // Uniqueness on name + countryId
    const uniqueMap = new Map();
    data.forEach((ele) => {
      const key = `${ele.name}_${ele.countryId?._id}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, ele);
      }
    });

    const uniqueData = Array.from(uniqueMap.values());

    // Apply pagination
    const paginatedData = parsedLimit
      ? uniqueData.slice(skip, skip + parsedLimit)
      : uniqueData;

    const formattedResult = paginatedData.map((ele) => ({
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
      courses: ele?.courses ?? [],
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
    }));

    sendResponse(res, 200, { formattedResult }, Messages.DATA_RETRIVED);
  } catch (error) {
    sendResponse(res, 400, null, error.message);
  }
};

//SECTION - get courses by university name
exports.getCoursesByUniversityName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      const missingField = "Name";
      return sendResponse(
        res,
        400,
        null,
        Messages.REQUIRED_FIELD(missingField)
      );
    }

    // Find all universities matching the name (case-insensitive)
    const universities = await University.find({
      name: { $regex: `^${name}$`, $options: "i" },
    }).lean();

    if (!universities || universities.length === 0) {
      return sendResponse(
        res,
        400,
        null,
        Messages.NOT_FOUND_DATA("University")
      );
    }

    // Collect and flatten all course arrays
    let allCourses = universities.flatMap((u) => u.courses || []);

    return sendResponse(res, 200, allCourses, Messages.DATA_FETCHED);
  } catch (error) {
    return sendResponse(res, 400, null, error.message);
  }
};
