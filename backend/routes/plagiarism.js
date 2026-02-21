const express = require('express');
const router = express.Router();
const {
    runPlagiarismScan,
    getCourseReports,
    getReportDetails,
    updateMatchVerdict,
    getNotifications,
    markNotificationRead,
    getUnreadCount,
    compareTwoSubmissions,
} = require('../controllers/plagiarismController');
const { authMiddleware, isProfessor } = require('../middleware/auth');

// All routes require professor/admin auth
router.use(authMiddleware, isProfessor);

// Run a plagiarism scan on an exercise
router.post('/scan/:exerciseId', runPlagiarismScan);

// Get all reports for a course
router.get('/course/:courseId/reports', getCourseReports);

// Get report details with matches
router.get('/report/:reportId', getReportDetails);

// Update verdict for a flagged match
router.put('/match/:matchId/verdict', updateMatchVerdict);

// Compare two specific submissions
router.post('/compare', compareTwoSubmissions);

// Notifications
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.put('/notifications/:notificationId/read', markNotificationRead);

module.exports = router;
