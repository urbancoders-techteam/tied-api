const router = require("express").Router();
const controller = require("../controller/testimonialController");
const { ValidateToken } = require("../middleware/auth");


router.post("/create", ValidateToken, controller.createTestimonial);
router.get("/", ValidateToken, controller.getAllTestimonials);
router.get("/:id", ValidateToken, controller.getTestimonialById);
router.put("/update/:id", ValidateToken, controller.updateTestimonial);
router.delete("/delete/:id", ValidateToken, controller.deleteTestimonialById);
router.post("/web", controller.getAllTestimonialsForWeb);

module.exports = router;
