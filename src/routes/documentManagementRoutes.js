const router = require("express").Router();
const controller = require("../controller/documentManagementController");
const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, controller.createDocumentManagement);
router.put("/update/:id", ValidateToken, controller.updateDocumentManagement);
router.get("/get-web", ValidateToken, controller.getDocumentManagementWeb);
router.get("/:id", ValidateToken, controller.getDocumentManagementById);
router.get("/", ValidateToken, controller.getAllDocumentManagement);
router.delete(
  "/delete/:id",
  ValidateToken,
  controller.deleteDocumentManagementById
);

router.get(
  "/web/get-student-document/:studentId",
  ValidateToken,
  controller.getStudentDocumentByIdAdmin
);

module.exports = router;
