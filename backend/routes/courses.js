const express = require('express');
const router = express.Router();
const {
    getAllCourses,
    getCourseById,
    createCourse,
    enrollInCourse,
    getUserCourses,
    getEnrolledCourseDetails,
    startTimeSession,
    endTimeSession,
    updateTimeSession,
} = require('../controllers/courseController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getAllCourses);

// Protected routes - My Courses (MUST come before /:id)
router.get('/my-courses/list', authMiddleware, getUserCourses);
router.get('/my-courses/:courseId/details', authMiddleware, getEnrolledCourseDetails);

// Time tracking routes
router.post('/my-courses/:courseId/time/start', authMiddleware, startTimeSession);
router.post('/my-courses/:courseId/time/end', authMiddleware, endTimeSession);
router.post('/my-courses/:courseId/time/heartbeat', authMiddleware, updateTimeSession);

// Course management
router.post('/', authMiddleware, isAdmin, createCourse);
router.post('/:courseId/enroll', authMiddleware, enrollInCourse);

// This must come LAST - it's a catch-all for course IDs
router.get('/:id', getCourseById);

module.exports = router;
