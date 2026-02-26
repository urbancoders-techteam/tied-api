const express = require("express");
const router = express.Router();
const controller = require("../controller/classController");
const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, controller.createClass);
router.get("/", ValidateToken, controller.getAllClasses);
router.get("/classes-for-batch", ValidateToken, controller.getClassesForBatch);
router.get("/:id", ValidateToken, controller.getClassById);
router.put("/update/:id", ValidateToken, controller.updateClass);
router.delete("/delete/:id", ValidateToken, controller.deleteClass);

module.exports = router;
