const express = require('express');
const router = express.Router();
const {
    getAllCourses,
    getCourseById,
    createCourse,
    enrollInCourse,
    getUserCourses,
} = require('../controllers/courseController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.get('/', getAllCourses);
router.get('/my-courses', authMiddleware, getUserCourses);
router.get('/:id', getCourseById);
router.post('/', authMiddleware, isAdmin, createCourse);
router.post('/:courseId/enroll', authMiddleware, enrollInCourse);

module.exports = router;
