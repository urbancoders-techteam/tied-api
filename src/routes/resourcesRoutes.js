const router = require("express").Router();
const controller = require("../controller/resourcesController");
const { ValidateToken } = require("../middleware/auth");

// STUDENT ROUTE
router.get("/student", ValidateToken, controller.getAllResourcesForStudent);

//ADMIN
router.post("/create", ValidateToken, controller.createResources);
router.put("/update/:id", ValidateToken, controller.updateResources);
router.get("/", ValidateToken, controller.getAllResources);
router.get("/:id", ValidateToken, controller.getResourceById);
router.delete("/delete/:id", ValidateToken, controller.deleteResourceById);

module.exports = router;
