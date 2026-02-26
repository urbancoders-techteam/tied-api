const router = require("express").Router();
const controller = require("../controller/permissionController");
const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, controller.createPermission);
router.get("/:id", ValidateToken, controller.getPermissionById);

module.exports = router;
