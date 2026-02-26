const router = require("express").Router();
const controller = require("../controller/universitySortListingController");
const { ValidateToken } = require("../middleware/auth");

router.post(
  "/getStudentAndConseller",
  ValidateToken,
  controller.getStudentWithCounsellor
);

router.post(
  "/seleted-university-student",
  ValidateToken,
  controller.getStudentSelectedUniversity
);

router.delete(
  "/delete-selected-university-student/:id",
  ValidateToken,
  controller.deleteStudentSelectedUniversity
);

// start
router.post(
  "/seleted-university-by-counseller",
  ValidateToken,
  controller.getUniversityByCounseller
);

router.post(
  "/get-scholarship-by=counsellor",
  ValidateToken,
  controller.getScholarshipsByCounsellor
);

router.post(
  "/get-scholarship-web",
  ValidateToken,
  controller.getScholarshipsForWeb
);

router.post(
  "/get-shortlisted-universities",
  ValidateToken,
  controller.getShortlistedUniversitiesByCounsellor
);

router.post(
  "/export-shortlisted-universities",
  ValidateToken,
  controller.exportShortlistedUniversitiesByCounsellor
);

router.get(
  "/:id",
  ValidateToken,
  controller.getUniversitySortListingByIdForCounsellor
);

router.post(
  "/create",
  ValidateToken,
  controller.createStudentUniversityListing
);

router.delete(
  "/delete/counsellor/:id",
  ValidateToken,
  controller.deleteStaffUniversitySortListingById
);

router.put(
  "/update-university-sort-listing/:id",
  ValidateToken,
  controller.updateUniversitySortListingForCounsellor
);

router.put(
  "/update-scholarship/:id",
  ValidateToken,
  controller.updateScholarshipsForCounsellor
);

router.put("/shortlist", ValidateToken, controller.updateShortlistStatus);

router.post(
  "/staff/create",
  ValidateToken,
  controller.createUniversitySortListingForStaff
);

router.get("/", ValidateToken, controller.getAllUniversitySortListingsStudents);
router.get(
  "/counsellor/",
  ValidateToken,
  controller.getUniversitySortListingsCreatedByCounsellor
);

router.post(
  "/getOne",
  ValidateToken,
  controller.getUniversitySortListingForCouncellor
);

router.post(
  "/getOne-student",
  ValidateToken,
  controller.getUniversitySortListingForStudent
);

router.post(
  "/remove-student-university",
  ValidateToken,
  controller.deleteUniversitySortlistedByStudent
);

router.get(
  "/student/:id",
  ValidateToken,
  controller.getUniversitySortListingById
);

router.delete(
  "/delete/student/:id",
  ValidateToken,
  controller.deleteStudentUniversitySortListingById
);

router.get(
  "/staff/all",
  ValidateToken,
  controller.getAllUniversitySortListingsByStaff
);

module.exports = router;
