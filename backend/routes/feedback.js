const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware, isProfessor } = require('../middleware/auth');

// Student routes - view feedback
router.get('/my-all', authMiddleware, feedbackController.getMyAllFeedback);
router.get('/course/:courseId', authMiddleware, feedbackController.getMyCourseFeedback);

// Professor routes - send and manage feedback
router.post('/send', authMiddleware, isProfessor, feedbackController.sendFeedback);
router.put('/:feedbackId', authMiddleware, isProfessor, feedbackController.updateMyFeedback);
router.delete('/:feedbackId', authMiddleware, isProfessor, feedbackController.deleteMyFeedback);
router.get('/professor', authMiddleware, isProfessor, feedbackController.getProfessorFeedback);

module.exports = router;
