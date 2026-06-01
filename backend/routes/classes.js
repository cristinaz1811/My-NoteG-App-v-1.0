const express = require('express');
const router = express.Router();
const { authMiddleware, isProfessor } = require('../middleware/auth');
const {
    getClassById,
    updateClass,
    deleteClass,
    getEnrollmentStatus,
    requestEnrollment,
    getEnrollmentRequests,
    getAllEnrollmentRequests,
    approveEnrollment,
    rejectEnrollment,
    regenerateAccessKey,
    getClassStudents,
} = require('../controllers/classController');

// Must be before /:classId to avoid being swallowed by the param route
router.get('/all-enrollment-requests', authMiddleware, isProfessor, getAllEnrollmentRequests);

router.get('/:classId',                                            getClassById);
router.put('/:classId',          authMiddleware, isProfessor,      updateClass);
router.delete('/:classId',       authMiddleware, isProfessor,      deleteClass);

// Enrollment — student
router.get('/:classId/enrollment-status',  authMiddleware,         getEnrollmentStatus);
router.post('/:classId/enroll',            authMiddleware,         requestEnrollment);

// Enrollment — professor
router.get('/:classId/enrollment-requests',  authMiddleware, isProfessor, getEnrollmentRequests);
router.put('/:classId/enrollment-requests/:userId/approve', authMiddleware, isProfessor, approveEnrollment);
router.put('/:classId/enrollment-requests/:userId/reject',  authMiddleware, isProfessor, rejectEnrollment);
router.post('/:classId/regenerate-key',    authMiddleware, isProfessor, regenerateAccessKey);
router.get('/:classId/students',           authMiddleware, isProfessor, getClassStudents);

module.exports = router;
