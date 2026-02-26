const router = require('express').Router();
const { createBlog, updateBlog, getAllBlogs, getBlog, deleteBlog, getAllBlogsForWeb, getBlogBySlugUrl } = require('../controller/blogController');
const { ValidateToken } = require('../middleware/auth');

//Web
router.get('/web', getAllBlogsForWeb);
router.get('/by-slugurl/:slugurl', getBlogBySlugUrl);

//Admin
router.post('/create', ValidateToken, createBlog);
router.put('/update/:id', ValidateToken, updateBlog);
router.get('/', ValidateToken,getAllBlogs);
router.get('/:id', ValidateToken, getBlog);
router.delete('/delete/:id', ValidateToken, deleteBlog);

module.exports = router;