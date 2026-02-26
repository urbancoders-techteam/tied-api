const router = require("express").Router();
const controller = require("../controller/profileBuildingController");
const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, controller.createProfileBuilding);
router.get(
  "/",
  ValidateToken,
  controller.getAllProfileBuildingAssignedToCounsellor
);
router.put("/update", ValidateToken, controller.updateProfileBuilding);
router.get(
  "/getProfileBuilding",
  ValidateToken,
  controller.getProfileBuildingById
);
router.get("/:id", ValidateToken, controller.getProfileBuildingByIdAmin);

router.post(
  "/feedback",
  ValidateToken,
  controller.addProfileFeedbackByCounsellor
);

module.exports = router;
