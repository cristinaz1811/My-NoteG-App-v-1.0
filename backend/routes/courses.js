const express = require('express');
const router = express.Router();
const {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    unenrollFromCourse,
    getUserCourses,
    getEnrolledCourseDetails,
    getProfessorCourses,
    addChapter,
    updateChapter,
    deleteChapter,
    startTimeSession,
    endTimeSession,
    updateTimeSession,
    getCourseEnrolledStudents,
    getStudentCourseDetails,
    getCourseExerciseStats,
    getExerciseStudentAttempts,
    regenerateEnrollmentCode,
    verifyEnrollmentCode,
    enrollByCode,
} = require('../controllers/courseController');
const { authMiddleware, optionalAuth, isAdmin, isProfessor } = require('../middleware/auth');

// Public routes (with optional auth to filter private courses)
router.get('/', optionalAuth, getAllCourses);

// Protected routes - My Courses (MUST come before /:id)
router.get('/my-courses/list', authMiddleware, getUserCourses);
router.get('/my-courses/:courseId/details', authMiddleware, getEnrolledCourseDetails);

// Time tracking routes
router.post('/my-courses/:courseId/time/start', authMiddleware, startTimeSession);
router.post('/my-courses/:courseId/time/end', authMiddleware, endTimeSession);
router.post('/my-courses/:courseId/time/heartbeat', authMiddleware, updateTimeSession);

// Professor routes
router.get('/professor/my-courses', authMiddleware, isProfessor, getProfessorCourses);
router.post('/professor/create', authMiddleware, isProfessor, createCourse);
router.put('/professor/:id', authMiddleware, isProfessor, updateCourse);
router.delete('/professor/:id', authMiddleware, isProfessor, deleteCourse);

// Chapter management (professor)
router.post('/professor/:courseId/chapters', authMiddleware, isProfessor, addChapter);
router.put('/professor/chapters/:chapterId', authMiddleware, isProfessor, updateChapter);
router.delete('/professor/chapters/:chapterId', authMiddleware, isProfessor, deleteChapter);

// Professor: View enrolled students
router.get('/professor/:courseId/students', authMiddleware, isProfessor, getCourseEnrolledStudents);
router.get('/professor/:courseId/students/:studentId', authMiddleware, isProfessor, getStudentCourseDetails);
router.get('/professor/:courseId/exercise-stats', authMiddleware, isProfessor, getCourseExerciseStats);
router.get('/professor/:courseId/exercise/:exerciseId/students', authMiddleware, isProfessor, getExerciseStudentAttempts);

// Professor: Enrollment code management
router.post('/professor/:courseId/regenerate-code', authMiddleware, isProfessor, regenerateEnrollmentCode);

// Enroll by code (no course ID needed - student just has the code)
router.post('/enroll-by-code', authMiddleware, enrollByCode);

// Course management (legacy admin route)
router.post('/', authMiddleware, isAdmin, createCourse);
router.post('/:courseId/enroll', authMiddleware, enrollInCourse);
router.post('/:courseId/verify-code', authMiddleware, verifyEnrollmentCode);
router.delete('/:courseId/unenroll', authMiddleware, unenrollFromCourse);

// This must come LAST - it's a catch-all for course IDs
router.get('/:id', getCourseById);

module.exports = router;
