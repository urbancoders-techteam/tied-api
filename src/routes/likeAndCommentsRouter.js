const router = require("express").Router();
const { createLikeAndComments } = require("../controller/likeAndCommentsController");

const { ValidateToken } = require("../middleware/auth");

router.post("/create", ValidateToken, createLikeAndComments);

module.exports = router;