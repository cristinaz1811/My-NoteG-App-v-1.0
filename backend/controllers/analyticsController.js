const db = require('../config/database');
const { generateStudentFeedback } = require('../utils/openaiService');

/**
 * GET /api/analytics/overview
 * High-level stats for the logged-in student.
 */
const getOverview = async (req, res) => {
    try {
        const userId = req.user.id;

        const overview = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM enrollments WHERE user_id = $1) AS enrolled_courses,
                (SELECT COUNT(*) FROM user_progress WHERE user_id = $1 AND completed = true) AS exercises_completed,
                (SELECT COUNT(*) FROM submissions WHERE user_id = $1) AS total_submissions,
                (SELECT COALESCE(AVG(best_score), 0) FROM user_progress WHERE user_id = $1 AND best_score > 0) AS average_score,
                (SELECT COALESCE(SUM(duration), 0) FROM course_time_sessions WHERE user_id = $1) AS total_time_spent,
                (SELECT COUNT(DISTINCT exercise_id) FROM submissions WHERE user_id = $1 AND status = 'passed') AS exercises_passed
        `, [userId]);

        res.json(overview.rows[0]);
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/analytics/progress-over-time
 * Submissions grouped by day for the past 30 days (activity heatmap data).
 */
const getProgressOverTime = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT
                DATE(submitted_at) AS day,
                COUNT(*) AS submissions,
                COUNT(*) FILTER (WHERE status = 'passed') AS passed,
                COUNT(*) FILTER (WHERE status = 'failed') AS failed,
                ROUND(AVG(score)::numeric, 2) AS avg_score
            FROM submissions
            WHERE user_id = $1
              AND submitted_at >= NOW() - INTERVAL '90 days'
            GROUP BY DATE(submitted_at)
            ORDER BY day
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Progress over time error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/analytics/course-performance
 * Per-course stats: progress %, avg score, time spent, exercises done.
 */
const getCoursePerformance = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT
                c.id AS course_id,
                c.title AS course_title,
                c.difficulty,
                e.progress,
                COALESCE(cts.total_time_spent, 0) AS total_time_spent,
                COALESCE(stats.exercises_total, 0) AS exercises_total,
                COALESCE(stats.exercises_completed, 0) AS exercises_completed,
                COALESCE(stats.avg_score, 0) AS avg_score,
                COALESCE(stats.total_attempts, 0) AS total_attempts
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN (
                SELECT course_id, COALESCE(SUM(duration), 0) AS total_time_spent
                FROM course_time_sessions
                WHERE user_id = $1
                GROUP BY course_id
            ) cts ON cts.course_id = c.id
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(DISTINCT ex.id) AS exercises_total,
                    COUNT(DISTINCT ex.id) FILTER (WHERE up.completed = true) AS exercises_completed,
                    ROUND(AVG(up.best_score)::numeric, 2) AS avg_score,
                    SUM(up.attempts) AS total_attempts
                FROM exercises ex
                LEFT JOIN user_progress up ON up.exercise_id = ex.id AND up.user_id = $1
                WHERE ex.course_id = c.id
            ) stats ON true
            WHERE e.user_id = $1
            ORDER BY c.title
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Course performance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/analytics/difficulty-breakdown
 * Strengths / weaknesses by exercise difficulty.
 */
const getDifficultyBreakdown = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT
                ex.difficulty,
                COUNT(DISTINCT ex.id) AS total_exercises,
                COUNT(DISTINCT ex.id) FILTER (WHERE up.completed = true) AS completed,
                ROUND(AVG(up.best_score)::numeric, 2) AS avg_score,
                ROUND(AVG(up.attempts)::numeric, 1) AS avg_attempts
            FROM exercises ex
            JOIN enrollments en ON en.course_id = ex.course_id AND en.user_id = $1
            LEFT JOIN user_progress up ON up.exercise_id = ex.id AND up.user_id = $1
            GROUP BY ex.difficulty
            ORDER BY CASE ex.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 END
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Difficulty breakdown error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/analytics/language-stats
 * Stats grouped by programming language.
 */
const getLanguageStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT
                s.language,
                COUNT(*) AS total_submissions,
                COUNT(*) FILTER (WHERE s.status = 'passed') AS passed,
                ROUND(AVG(s.score)::numeric, 2) AS avg_score,
                COUNT(DISTINCT s.exercise_id) AS exercises_attempted
            FROM submissions s
            WHERE s.user_id = $1
            GROUP BY s.language
            ORDER BY total_submissions DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Language stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/analytics/recent-submissions
 * Last 20 submissions with exercise info.
 */
const getRecentSubmissions = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT
                s.id,
                s.exercise_id,
                ex.title AS exercise_title,
                c.title AS course_title,
                ex.difficulty,
                s.language,
                s.status,
                s.score,
                s.tests_passed,
                s.tests_total,
                s.execution_time,
                s.submitted_at
            FROM submissions s
            JOIN exercises ex ON s.exercise_id = ex.id
            JOIN courses c ON ex.course_id = c.id
            WHERE s.user_id = $1
            ORDER BY s.submitted_at DESC
            LIMIT 20
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Recent submissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/analytics/time-per-course
 * Time spent breakdown per course (for chart).
 */
const getTimePerCourse = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT
                c.id AS course_id,
                c.title AS course_title,
                COALESCE(SUM(cts.duration), 0) AS total_time_spent
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN course_time_sessions cts ON cts.user_id = e.user_id AND cts.course_id = e.course_id
            WHERE e.user_id = $1
            GROUP BY c.id, c.title
            HAVING COALESCE(SUM(cts.duration), 0) > 0
            ORDER BY total_time_spent DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Time per course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/analytics/ai-feedback
 * Uses OpenAI to generate personalized growth feedback.
 */
const getAIFeedback = async (req, res) => {
    try {
        const userId = req.user.id;

        // Gather comprehensive student data for AI analysis
        const [overviewRes, courseRes, difficultyRes, languageRes, recentRes] = await Promise.all([
            db.query(`
                SELECT
                    (SELECT COUNT(*) FROM enrollments WHERE user_id = $1) AS enrolled_courses,
                    (SELECT COUNT(*) FROM user_progress WHERE user_id = $1 AND completed = true) AS exercises_completed,
                    (SELECT COUNT(*) FROM submissions WHERE user_id = $1) AS total_submissions,
                    (SELECT COALESCE(AVG(best_score), 0) FROM user_progress WHERE user_id = $1 AND best_score > 0) AS average_score,
                    (SELECT COALESCE(SUM(duration), 0) FROM course_time_sessions WHERE user_id = $1) AS total_time_spent
            `, [userId]),
            db.query(`
                SELECT c.title, c.difficulty,
                       COALESCE(stats.exercises_completed, 0) AS exercises_completed,
                       COALESCE(stats.exercises_total, 0) AS exercises_total,
                       COALESCE(stats.avg_score, 0) AS avg_score
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(DISTINCT ex.id) AS exercises_total,
                        COUNT(DISTINCT ex.id) FILTER (WHERE up.completed = true) AS exercises_completed,
                        ROUND(AVG(up.best_score)::numeric, 2) AS avg_score
                    FROM exercises ex
                    LEFT JOIN user_progress up ON up.exercise_id = ex.id AND up.user_id = $1
                    WHERE ex.course_id = c.id
                ) stats ON true
                WHERE e.user_id = $1
            `, [userId]),
            db.query(`
                SELECT ex.difficulty,
                       COUNT(DISTINCT ex.id) AS total,
                       COUNT(DISTINCT ex.id) FILTER (WHERE up.completed = true) AS completed,
                       ROUND(AVG(up.best_score)::numeric, 2) AS avg_score,
                       ROUND(AVG(up.attempts)::numeric, 1) AS avg_attempts
                FROM exercises ex
                JOIN enrollments en ON en.course_id = ex.course_id AND en.user_id = $1
                LEFT JOIN user_progress up ON up.exercise_id = ex.id AND up.user_id = $1
                GROUP BY ex.difficulty
            `, [userId]),
            db.query(`
                SELECT s.language, COUNT(*) AS submissions,
                       COUNT(*) FILTER (WHERE s.status = 'passed') AS passed,
                       ROUND(AVG(s.score)::numeric, 2) AS avg_score
                FROM submissions s WHERE s.user_id = $1
                GROUP BY s.language
            `, [userId]),
            db.query(`
                SELECT ex.title, ex.difficulty, s.status, s.score, s.submitted_at
                FROM submissions s
                JOIN exercises ex ON s.exercise_id = ex.id
                WHERE s.user_id = $1
                ORDER BY s.submitted_at DESC LIMIT 10
            `, [userId]),
        ]);

        const studentData = {
            overview: overviewRes.rows[0],
            courses: courseRes.rows,
            difficultyBreakdown: difficultyRes.rows,
            languages: languageRes.rows,
            recentActivity: recentRes.rows,
        };

        const feedback = await generateStudentFeedback(studentData);
        res.json({ feedback });
    } catch (error) {
        console.error('AI feedback error:', error);
        res.status(500).json({ error: 'Failed to generate AI feedback' });
    }
};

/**
 * GET /api/analytics/recommended-next
 * Suggests the next exercise to work on per enrolled course: the earliest
 * incomplete exercise (by chapter then exercise order), with courses the
 * student has progressed furthest in surfaced first.
 */
const getRecommendedNext = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT * FROM (
                SELECT DISTINCT ON (c.id)
                    ex.id AS exercise_id,
                    ex.title AS exercise_title,
                    ex.difficulty,
                    ex.language,
                    c.id AS course_id,
                    c.title AS course_title,
                    ch.title AS chapter_title,
                    e.progress AS course_progress
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                JOIN exercises ex ON ex.course_id = c.id
                LEFT JOIN chapters ch ON ex.chapter_id = ch.id
                LEFT JOIN user_progress up
                    ON up.exercise_id = ex.id AND up.user_id = $1
                WHERE e.user_id = $1
                  AND COALESCE(up.completed, false) = false
                ORDER BY c.id, ch.order_index NULLS LAST, ex.order_index NULLS LAST, ex.id
            ) per_course
            ORDER BY course_progress DESC, course_title
            LIMIT 3
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Recommended next error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getOverview,
    getProgressOverTime,
    getCoursePerformance,
    getDifficultyBreakdown,
    getLanguageStats,
    getRecentSubmissions,
    getTimePerCourse,
    getAIFeedback,
    getRecommendedNext,
};
