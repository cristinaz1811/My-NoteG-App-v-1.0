const db = require('../config/database');
const { notifyStudentNeedsHelp } = require('../utils/notificationService');

// Get all notifications for the current user
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0, unreadOnly = false } = req.query;

        let query = `
            SELECT n.*, 
                   u.username as from_username
            FROM notifications n
            LEFT JOIN users u ON n.from_user_id = u.id
            WHERE n.user_id = $1
        `;
        const params = [userId];

        if (unreadOnly === 'true') {
            query += ` AND n.is_read = FALSE`;
        }

        query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete a notification
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Student: Request help from professor
const requestHelp = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { exerciseId } = req.params;
        const { message } = req.body;

        // Get exercise and course info
        const exercise = await db.query(
            'SELECT e.*, e.course_id FROM exercises e WHERE e.id = $1',
            [exerciseId]
        );

        if (exercise.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        const courseId = exercise.rows[0].course_id;

        // Check if student is enrolled
        const enrollment = await db.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [studentId, courseId]
        );

        if (enrollment.rows.length === 0) {
            return res.status(403).json({ error: 'Not enrolled in this course' });
        }

        // Check for recent duplicate help requests (within last hour)
        const recentRequest = await db.query(
            `SELECT * FROM help_requests 
             WHERE student_id = $1 AND exercise_id = $2 AND status = 'open'
             AND created_at > NOW() - INTERVAL '1 hour'`,
            [studentId, exerciseId]
        );

        if (recentRequest.rows.length > 0) {
            return res.status(429).json({ error: 'You already have a pending help request for this exercise. Please wait before requesting help again.' });
        }

        // Create help request and notify professor
        await notifyStudentNeedsHelp({
            studentId,
            exerciseId,
            courseId,
            helpMessage: message || null,
        });

        res.status(201).json({ message: 'Help request sent to your professor' });
    } catch (error) {
        console.error('Request help error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Get help requests for their courses
const getHelpRequests = async (req, res) => {
    try {
        const professorId = req.user.id;
        const { status = 'open' } = req.query;

        const result = await db.query(`
            SELECT hr.*, 
                   u.username as student_name,
                   e.title as exercise_title,
                   c.title as course_title
            FROM help_requests hr
            JOIN users u ON hr.student_id = u.id
            JOIN exercises e ON hr.exercise_id = e.id
            JOIN courses c ON hr.course_id = c.id
            WHERE c.created_by = $1
            ${status !== 'all' ? `AND hr.status = $2` : ''}
            ORDER BY hr.created_at DESC
            LIMIT 50
        `, status !== 'all' ? [professorId, status] : [professorId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get help requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Resolve a help request
const resolveHelpRequest = async (req, res) => {
    try {
        const professorId = req.user.id;
        const { id } = req.params;

        // Verify the help request belongs to a course owned by this professor
        const helpRequest = await db.query(`
            SELECT hr.*, c.created_by
            FROM help_requests hr
            JOIN courses c ON hr.course_id = c.id
            WHERE hr.id = $1
        `, [id]);

        if (helpRequest.rows.length === 0) {
            return res.status(404).json({ error: 'Help request not found' });
        }

        if (helpRequest.rows[0].created_by !== professorId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await db.query(
            `UPDATE help_requests SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Resolve help request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestHelp,
    getHelpRequests,
    resolveHelpRequest,
};
