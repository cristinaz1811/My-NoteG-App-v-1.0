const express = require('express');
const router = express.Router();
const {
    getLeaderboard,
    getCourseLeaderboard,
    getMyGamification,
    getAllBadges,
    getXPSummary,
} = require('../controllers/gamificationController');
const { authMiddleware } = require('../middleware/auth');

// Public leaderboard (auth optional for user rank)
router.get('/leaderboard', authMiddleware, getLeaderboard);

// Course-specific leaderboard
router.get('/leaderboard/course/:courseId', authMiddleware, getCourseLeaderboard);

// User's gamification profile
router.get('/me', authMiddleware, getMyGamification);

// XP summary for navbar (lightweight)
router.get('/xp-summary', authMiddleware, getXPSummary);

// All badges with progress
router.get('/badges', authMiddleware, getAllBadges);

module.exports = router;
