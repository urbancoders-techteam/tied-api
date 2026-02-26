const router = require("express").Router();
const {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  updateStatus,
} = require("../controller/communityController");
const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, createCommunity);
router.get("/", ValidateToken, getAllCommunities);
router.get("/:id", ValidateToken, getCommunityById);
router.put("/update/:id", ValidateToken, updateCommunity);
router.delete("/delete/:id", ValidateToken, deleteCommunity);
router.post("/update-status", ValidateToken, updateStatus);

module.exports = router;
