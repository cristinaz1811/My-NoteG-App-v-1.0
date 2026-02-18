const db = require('../config/database');

const getAllCourses = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, u.username as creator_name,
                   COUNT(DISTINCT e.id) as exercise_count
            FROM courses c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN exercises e ON c.id = e.course_id
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

        const courseResult = await db.query(
            'SELECT c.*, u.username as creator_name FROM courses c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = $1',
            [id]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const exercisesResult = await db.query(
            'SELECT id, title, description, difficulty FROM exercises WHERE course_id = $1 ORDER BY id',
            [id]
        );

        res.json({
            ...courseResult.rows[0],
            exercises: exercisesResult.rows,
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
            SELECT c.*, e.progress, e.enrolled_at,
                   COUNT(DISTINCT ex.id) as total_exercises,
                   COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as completed_exercises
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN exercises ex ON c.id = ex.course_id
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = e.user_id
            WHERE e.user_id = $1
            GROUP BY c.id, e.progress, e.enrolled_at
            ORDER BY e.enrolled_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get user courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    enrollInCourse,
    getUserCourses,
};
