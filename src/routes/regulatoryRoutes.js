const router = require("express").Router();
const controller = require("../controller/regulatoryBodiesController");
const { ValidateToken } = require("../middleware/auth");

// Correct - No auth middleware
router.get("/public", controller.getAllRegulatoryBodiesForWeb);

//ADMIN
router.post("/create", ValidateToken, controller.createRegulatoryBody);
router.put("/update/:id", ValidateToken, controller.updateRegulatoryBody);
router.get("/", ValidateToken, controller.getAllRegulatoryBodies);
router.get("/:id", ValidateToken, controller.getRegulatoryBodyById);
router.delete("/delete/:id", ValidateToken, controller.deleteRegulatoryBody);

module.exports = router;
