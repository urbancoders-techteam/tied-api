const router = require("express").Router();

const { createWebBanner, getAllWebBanners, deleteWebBanner, getWebBannerById, updateWebBanner } = require("../controller/webBannerController");
const { ValidateToken } = require("../middleware/auth")

router.post('/create', ValidateToken, createWebBanner);
router.get('/', getAllWebBanners);
router.get('/:id', ValidateToken, getWebBannerById);
router.put('/update/:id', ValidateToken, updateWebBanner);
router.delete('/delete/:id', ValidateToken, deleteWebBanner);

module.exports = router;
