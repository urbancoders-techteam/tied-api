const router = require("express").Router();
const controller = require("../controller/batchController");
const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, controller.createBatch);
router.get("/", ValidateToken, controller.listBatch);
router.get(
  "/student/:studentId/batches/:planId",
  controller.getBatchesByStudentAndPlan
);

router.get("/:id", ValidateToken, controller.getBatchById);
router.put("/:id", ValidateToken, controller.updateBatch);
router.delete("/:id", ValidateToken, controller.deleteBatch);

router.post(
  "/:id/modify-students",
  ValidateToken,
  controller.modifyStudentsInBatch
);

router.post(
  "/:id/modify-classes",
  ValidateToken,
  controller.modifyClassesInBatch
);

router.post(
  "/:id/modify-mocktest",
  ValidateToken,
  controller.modifyMockTestsInBatch
);

module.exports = router;
