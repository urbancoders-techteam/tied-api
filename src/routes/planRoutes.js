const router = require("express").Router();
const controller = require("../controller/planController");
const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, controller.createPlan);
router.patch("/update/:id", ValidateToken, controller.updatePlan);
router.get("/", ValidateToken, controller.getAllPlans);
router.get("/:id", ValidateToken, controller.getPlanById);
router.delete("/delete/:id", ValidateToken, controller.deletePlan);

module.exports = router;
