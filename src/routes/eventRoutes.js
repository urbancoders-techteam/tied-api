const router = require("express").Router();
const controller = require("../controller/eventController.js");
const { ValidateToken } = require("../middleware/auth.js");


router.post("/create", ValidateToken, controller.createEvent);
router.put("/update/:id", ValidateToken, controller.updateEvent);
router.get("/:id", ValidateToken, controller.getEventById);
router.get("/", ValidateToken, controller.getAllEvents);
router.delete("/delete/:id",ValidateToken,controller.deleteEventById);
router.post("/web", controller.getAllEventsForWeb);
module.exports = router;
