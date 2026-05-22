const express = require('express');
const router = express.Router();
const {
    getOverview,
    getProgressOverTime,
    getCoursePerformance,
    getDifficultyBreakdown,
    getLanguageStats,
    getRecentSubmissions,
    getTimePerCourse,
    getAIFeedback,
    getRecommendedNext,
} = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

// All analytics routes require authentication
router.use(authMiddleware);

router.get('/overview', getOverview);
router.get('/progress-over-time', getProgressOverTime);
router.get('/course-performance', getCoursePerformance);
router.get('/difficulty-breakdown', getDifficultyBreakdown);
router.get('/language-stats', getLanguageStats);
router.get('/recent-submissions', getRecentSubmissions);
router.get('/time-per-course', getTimePerCourse);
router.get('/recommended-next', getRecommendedNext);
router.post('/ai-feedback', getAIFeedback);

module.exports = router;
