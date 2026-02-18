const db = require('../config/database');

const getAllCourses = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, u.username as creator_name,
                   COUNT(DISTINCT e.id) as exercise_count,
                   COUNT(DISTINCT ch.id) as chapter_count
            FROM courses c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN exercises e ON c.id = e.course_id
            LEFT JOIN chapters ch ON c.id = ch.course_id
            GROUP BY c.id, u.username
            ORDER BY c.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        // Get course with all details
        const courseResult = await db.query(
            `SELECT c.*, u.username as creator_name 
             FROM courses c 
             LEFT JOIN users u ON c.created_by = u.id 
             WHERE c.id = $1`,
            [id]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Get chapters with their exercises
        const chaptersResult = await db.query(`
            SELECT ch.id, ch.title, ch.description, ch.order_index,
                   json_agg(
                       json_build_object(
                           'id', e.id,
                           'title', e.title,
                           'description', e.description,
                           'difficulty', e.difficulty,
                           'language', e.language,
                           'order_index', e.order_index
                       ) ORDER BY e.order_index
                   ) FILTER (WHERE e.id IS NOT NULL) as exercises
            FROM chapters ch
            LEFT JOIN exercises e ON e.chapter_id = ch.id
            WHERE ch.course_id = $1
            GROUP BY ch.id
            ORDER BY ch.order_index
        `, [id]);

        // Get exercises without chapter (for backwards compatibility)
        const unassignedExercises = await db.query(
            `SELECT id, title, description, difficulty, language, order_index 
             FROM exercises 
             WHERE course_id = $1 AND chapter_id IS NULL 
             ORDER BY order_index, id`,
            [id]
        );

        // Get all exercises flat (for backward compatibility)
        const allExercises = await db.query(
            `SELECT id, title, description, difficulty, language 
             FROM exercises 
             WHERE course_id = $1 
             ORDER BY order_index, id`,
            [id]
        );

        res.json({
            ...courseResult.rows[0],
            chapters: chaptersResult.rows,
            unassignedExercises: unassignedExercises.rows,
            exercises: allExercises.rows, // Keep for backward compatibility
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createCourse = async (req, res) => {
    try {
        const { title, description, difficulty } = req.body;
        const createdBy = req.user.id;

        const result = await db.query(
            'INSERT INTO courses (title, description, difficulty, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, description, difficulty, createdBy]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Check if already enrolled
        const existing = await db.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Already enrolled in this course' });
        }

        const result = await db.query(
            'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) RETURNING *',
            [userId, courseId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Enroll course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getUserCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT 
                c.id,
                c.title,
                c.description,
                c.difficulty,
                e.progress,
                e.enrolled_at,
                COALESCE(e.total_time_spent, 0) as total_time_spent,
                COUNT(DISTINCT ex.id) as total_exercises,
                COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as completed_exercises,
                COALESCE(sub_stats.total_attempts, 0) as total_attempts,
                COALESCE(sub_stats.avg_score, 0) as average_score
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN exercises ex ON c.id = ex.course_id
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = e.user_id
            LEFT JOIN (
                SELECT 
                    ex2.course_id,
                    COUNT(s.id) as total_attempts,
                    ROUND(AVG(s.score)::numeric, 2) as avg_score
                FROM submissions s
                JOIN exercises ex2 ON s.exercise_id = ex2.id
                WHERE s.user_id = $1
                GROUP BY ex2.course_id
            ) sub_stats ON c.id = sub_stats.course_id
            WHERE e.user_id = $1
            GROUP BY c.id, c.title, c.description, c.difficulty, e.progress, e.enrolled_at, e.total_time_spent, sub_stats.total_attempts, sub_stats.avg_score
            ORDER BY e.enrolled_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get user courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get detailed stats for a specific enrolled course
const getEnrolledCourseDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        // Check enrollment
        const enrollment = await db.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        if (enrollment.rows.length === 0) {
            return res.status(404).json({ error: 'Not enrolled in this course' });
        }

        // Get course info
        const courseResult = await db.query(
            'SELECT * FROM courses WHERE id = $1',
            [courseId]
        );

        // Get all exercises with user progress
        const exercisesResult = await db.query(`
            SELECT 
                ex.id,
                ex.title,
                ex.description,
                ex.difficulty,
                ex.language,
                COALESCE(up.completed, false) as completed,
                COALESCE(up.best_score, 0) as best_score,
                COALESCE(up.attempts, 0) as attempts,
                up.last_attempt_at
            FROM exercises ex
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = $1
            WHERE ex.course_id = $2
            ORDER BY ex.id
        `, [userId, courseId]);

        // Get submission history for this course
        const submissionsResult = await db.query(`
            SELECT 
                s.id,
                s.exercise_id,
                ex.title as exercise_title,
                s.score,
                s.tests_passed,
                s.tests_total,
                s.status,
                s.submitted_at
            FROM submissions s
            JOIN exercises ex ON s.exercise_id = ex.id
            WHERE s.user_id = $1 AND ex.course_id = $2
            ORDER BY s.submitted_at DESC
            LIMIT 50
        `, [userId, courseId]);

        // Get time spent breakdown
        const timeResult = await db.query(`
            SELECT 
                DATE(started_at) as date,
                SUM(duration) as time_spent
            FROM time_sessions
            WHERE user_id = $1 AND course_id = $2 AND duration IS NOT NULL
            GROUP BY DATE(started_at)
            ORDER BY date DESC
            LIMIT 30
        `, [userId, courseId]);

        // Calculate total time from time_sessions (this is more accurate than enrollment total)
        const totalTimeResult = await db.query(`
            SELECT COALESCE(SUM(duration), 0) as total_time
            FROM time_sessions
            WHERE user_id = $1 AND course_id = $2 AND duration IS NOT NULL
        `, [userId, courseId]);
        const totalTimeSpent = parseInt(totalTimeResult.rows[0].total_time) || 0;

        // Calculate stats
        const totalAttempts = exercisesResult.rows.reduce((sum, ex) => sum + ex.attempts, 0);
        const completedExercises = exercisesResult.rows.filter(ex => ex.completed).length;
        const avgScore = exercisesResult.rows.length > 0
            ? exercisesResult.rows.reduce((sum, ex) => sum + parseFloat(ex.best_score || 0), 0) / exercisesResult.rows.length
            : 0;

        res.json({
            course: courseResult.rows[0],
            enrollment: enrollment.rows[0],
            exercises: exercisesResult.rows,
            submissions: submissionsResult.rows,
            timeBreakdown: timeResult.rows,
            stats: {
                totalAttempts,
                completedExercises,
                totalExercises: exercisesResult.rows.length,
                averageScore: Math.round(avgScore * 100) / 100,
                totalTimeSpent: totalTimeSpent,
                progressPercentage: exercisesResult.rows.length > 0
                    ? Math.round((completedExercises / exercisesResult.rows.length) * 100)
                    : 0
            }
        });
    } catch (error) {
        console.error('Get enrolled course details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Start a time tracking session
const startTimeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        // Check enrollment
        const enrollment = await db.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        if (enrollment.rows.length === 0) {
            return res.status(403).json({ error: 'Not enrolled in this course' });
        }

        // End any existing open sessions for this user/course
        await db.query(`
            UPDATE time_sessions 
            SET ended_at = CURRENT_TIMESTAMP, 
                duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
            WHERE user_id = $1 AND course_id = $2 AND ended_at IS NULL
        `, [userId, courseId]);

        // Start new session
        const result = await db.query(
            'INSERT INTO time_sessions (user_id, course_id) VALUES ($1, $2) RETURNING *',
            [userId, courseId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Start time session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// End a time tracking session
const endTimeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        // End the session and calculate duration
        const result = await db.query(`
            UPDATE time_sessions 
            SET ended_at = CURRENT_TIMESTAMP, 
                duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
            WHERE user_id = $1 AND course_id = $2 AND ended_at IS NULL
            RETURNING *
        `, [userId, courseId]);

        if (result.rows.length > 0) {
            const duration = result.rows[0].duration;

            // Update total time in enrollments
            await db.query(`
                UPDATE enrollments 
                SET total_time_spent = total_time_spent + $3
                WHERE user_id = $1 AND course_id = $2
            `, [userId, courseId, duration]);
        }

        res.json({ message: 'Session ended', session: result.rows[0] || null });
    } catch (error) {
        console.error('End time session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Heartbeat to keep session alive and update time (call every 30 seconds)
const updateTimeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        // Check for active session
        const session = await db.query(`
            SELECT * FROM time_sessions 
            WHERE user_id = $1 AND course_id = $2 AND ended_at IS NULL
            ORDER BY started_at DESC LIMIT 1
        `, [userId, courseId]);

        if (session.rows.length === 0) {
            // No active session, start one
            const newSession = await db.query(
                'INSERT INTO time_sessions (user_id, course_id) VALUES ($1, $2) RETURNING *',
                [userId, courseId]
            );
            return res.json({ session: newSession.rows[0], isNew: true });
        }

        res.json({ session: session.rows[0], isNew: false });
    } catch (error) {
        console.error('Update time session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    enrollInCourse,
    getUserCourses,
    getEnrolledCourseDetails,
    startTimeSession,
    endTimeSession,
    updateTimeSession,
};
