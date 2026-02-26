const express = require("express");
const router = express.Router();
const controller = require("../controller/mockTest");
const { ValidateToken } = require("../middleware/auth");

router.get("/userMockTest", ValidateToken, controller.mockWeb);
router.post("/create", ValidateToken, controller.createMockTest);
router.get("/web", ValidateToken, controller.list);
router.get("/", ValidateToken, controller.listMockTest);
router.get(
  "/mocktest-for-batch",
  ValidateToken,
  controller.getMockTestsForBatch
);
router.get("/:id", ValidateToken, controller.getMockTest);
router.put("/update/:id", ValidateToken, controller.updateMockTest);
router.delete("/delete/:id", ValidateToken, controller.deleteMockTest);
module.exports = router;
