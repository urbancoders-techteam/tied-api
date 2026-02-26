const router = require("express").Router();
const controller = require("../controller/routeController");
const { ValidateToken } = require("../middleware/auth");

router.post('/create',ValidateToken,controller.createAdminRoute)
router.get('/',ValidateToken,controller.getAllAdminRoutes);
router.delete('/delete/:id',ValidateToken,controller.deleteAdminRoute);

module.exports = router;
