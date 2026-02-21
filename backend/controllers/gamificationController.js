const db = require('../config/database');
const { getUserGamificationProfile, ensureUserXP, getLevelForXP } = require('../utils/gamificationService');

/**
 * Get global leaderboard
 * Supports: ?type=xp|level|streak|exercises&limit=50&page=1
 */
const getLeaderboard = async (req, res) => {
    try {
        const { type = 'xp', limit = 50, page = 1 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const userId = req.user?.id;

        let orderBy;
        switch (type) {
            case 'level':
                orderBy = 'ux.level DESC, ux.total_xp DESC';
                break;
            case 'streak':
                orderBy = 'ux.current_streak DESC, ux.total_xp DESC';
                break;
            case 'exercises':
                orderBy = 'ux.exercises_completed DESC, ux.total_xp DESC';
                break;
            default: // xp
                orderBy = 'ux.total_xp DESC, ux.level DESC';
        }

        const result = await db.query(`
            SELECT 
                u.id, u.username, u.role,
                ux.total_xp, ux.level, ux.current_streak, ux.longest_streak,
                ux.exercises_completed, ux.perfect_scores,
                (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badge_count,
                ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
            FROM users u
            JOIN user_xp ux ON u.id = ux.user_id
            WHERE u.role = 'student' AND ux.total_xp > 0
            ORDER BY ${orderBy}
            LIMIT $1 OFFSET $2
        `, [parseInt(limit), offset]);

        // Get total count
        const countResult = await db.query(
            "SELECT COUNT(*) as total FROM user_xp ux JOIN users u ON ux.user_id = u.id WHERE u.role = 'student' AND ux.total_xp > 0"
        );

        // Get current user's rank if authenticated
        let userRank = null;
        if (userId) {
            const rankResult = await db.query(`
                SELECT rank FROM (
                    SELECT u.id, ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
                    FROM users u
                    JOIN user_xp ux ON u.id = ux.user_id
                    WHERE u.role = 'student' AND ux.total_xp > 0
                ) ranked
                WHERE id = $1
            `, [userId]);
            userRank = rankResult.rows[0]?.rank || null;
        }

        res.json({
            leaderboard: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit),
            userRank: userRank ? parseInt(userRank) : null,
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get course-specific leaderboard
 */
const getCourseLeaderboard = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { limit = 50 } = req.query;

        const result = await db.query(`
            SELECT 
                u.id, u.username,
                ux.total_xp, ux.level,
                e.progress,
                COUNT(DISTINCT up.exercise_id) FILTER (WHERE up.completed = true) as exercises_completed,
                (SELECT COUNT(*) FROM exercises WHERE course_id = $1) as total_exercises,
                COALESCE(SUM(xt.amount), 0) as course_xp
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN user_xp ux ON u.id = ux.user_id
            LEFT JOIN user_progress up ON u.id = up.user_id 
                AND up.exercise_id IN (SELECT id FROM exercises WHERE course_id = $1)
            LEFT JOIN xp_transactions xt ON u.id = xt.user_id 
                AND xt.reason = 'exercise_complete'
                AND xt.reference_id IN (SELECT id FROM exercises WHERE course_id = $1)
            WHERE e.course_id = $1
            GROUP BY u.id, u.username, ux.total_xp, ux.level, e.progress
            ORDER BY course_xp DESC, exercises_completed DESC
            LIMIT $2
        `, [courseId, parseInt(limit)]);

        res.json({ leaderboard: result.rows });
    } catch (error) {
        console.error('Get course leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get current user's gamification profile
 */
const getMyGamification = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getUserGamificationProfile(userId);
        res.json(profile);
    } catch (error) {
        console.error('Get gamification profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all available badges with user's progress
 */
const getAllBadges = async (req, res) => {
    try {
        const userId = req.user.id;

        const badges = await db.query(`
            SELECT b.*, 
                   CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as earned,
                   ub.earned_at
            FROM badges b
            LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
            ORDER BY b.category, b.requirement_value
        `, [userId]);

        // Get user stats for progress calculation
        const userXP = await ensureUserXP(userId);

        // Count completed courses
        const completedCourses = await db.query(
            `SELECT COUNT(DISTINCT e.course_id) as count
             FROM user_progress up
             JOIN exercises e ON up.exercise_id = e.id
             WHERE up.user_id = $1 AND up.completed = true
             AND NOT EXISTS (
                 SELECT 1 FROM exercises e2 
                 WHERE e2.course_id = e.course_id 
                 AND e2.id NOT IN (SELECT exercise_id FROM user_progress WHERE user_id = $1 AND completed = true)
             )`,
            [userId]
        );

        const stats = {
            exercises_completed: userXP.exercises_completed,
            perfect_scores: userXP.perfect_scores,
            streak_days: Math.max(userXP.current_streak, userXP.longest_streak),
            courses_completed: parseInt(completedCourses.rows[0]?.count || 0),
            xp_total: userXP.total_xp,
        };

        // Calculate progress for each badge
        const badgesWithProgress = badges.rows.map(badge => {
            const currentValue = stats[badge.requirement_type] || 0;
            const progress = Math.min(Math.round((currentValue / badge.requirement_value) * 100), 100);
            return {
                ...badge,
                progress,
                currentValue,
            };
        });

        res.json({ badges: badgesWithProgress });
    } catch (error) {
        console.error('Get badges error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get XP summary for navbar (lightweight endpoint)
 */
const getXPSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const userXP = await ensureUserXP(userId);
        const { level, currentThreshold, nextThreshold } = getLevelForXP(userXP.total_xp);

        res.json({
            totalXP: userXP.total_xp,
            level,
            streak: userXP.current_streak,
            progressPercent: Math.round(((userXP.total_xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100),
        });
    } catch (error) {
        console.error('Get XP summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getLeaderboard,
    getCourseLeaderboard,
    getMyGamification,
    getAllBadges,
    getXPSummary,
};
