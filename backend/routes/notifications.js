const express = require('express');
const router = express.Router();
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestHelp,
    getHelpRequests,
    resolveHelpRequest,
} = require('../controllers/notificationController');
const { authMiddleware, isProfessor } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Notification routes (any authenticated user)
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Student help request
router.post('/help/:exerciseId', requestHelp);

// Professor help request management
router.get('/help-requests', isProfessor, getHelpRequests);
router.put('/help-requests/:id/resolve', isProfessor, resolveHelpRequest);

module.exports = router;
