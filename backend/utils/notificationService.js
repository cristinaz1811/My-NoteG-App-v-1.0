const db = require('../config/database');

// In-memory store for WebSocket connections: userId -> Set of ws connections
const connectedClients = new Map();

/**
 * Register a WebSocket connection for a user
 */
const registerClient = (userId, ws) => {
    if (!connectedClients.has(userId)) {
        connectedClients.set(userId, new Set());
    }
    connectedClients.get(userId).add(ws);
    console.log(`[WS] User ${userId} connected. Total connections: ${connectedClients.get(userId).size}`);
};

/**
 * Remove a WebSocket connection for a user
 */
const removeClient = (userId, ws) => {
    const clients = connectedClients.get(userId);
    if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
            connectedClients.delete(userId);
        }
        console.log(`[WS] User ${userId} disconnected. Remaining: ${clients ? clients.size : 0}`);
    }
};

/**
 * Send a real-time message to a specific user via WebSocket
 */
const sendToUser = (userId, data) => {
    const clients = connectedClients.get(userId);
    if (clients) {
        const message = JSON.stringify(data);
        clients.forEach(ws => {
            if (ws.readyState === 1) { // WebSocket.OPEN
                ws.send(message);
            }
        });
    }
};

/**
 * Create a notification in DB and push it via WebSocket
 */
const createNotification = async ({ userId, type, title, message, link, courseId, exerciseId, fromUserId }) => {
    try {
        const result = await db.query(
            `INSERT INTO notifications (user_id, type, title, message, link, course_id, exercise_id, from_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [userId, type, title, message, link || null, courseId || null, exerciseId || null, fromUserId || null]
        );

        const notification = result.rows[0];

        // Push real-time notification via WebSocket
        sendToUser(userId, {
            type: 'notification',
            notification,
        });

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

/**
 * Notify all enrolled students in a course about a new exercise
 */
const notifyNewExercise = async ({ courseId, exerciseTitle, exerciseId, professorId }) => {
    try {
        // Get all enrolled students
        const enrollments = await db.query(
            'SELECT user_id FROM enrollments WHERE course_id = $1',
            [courseId]
        );

        // Get course name
        const course = await db.query('SELECT title FROM courses WHERE id = $1', [courseId]);
        const courseName = course.rows[0]?.title || 'Unknown Course';

        for (const enrollment of enrollments.rows) {
            await createNotification({
                userId: enrollment.user_id,
                type: 'new_exercise',
                title: 'New Exercise Available',
                message: `A new exercise "${exerciseTitle}" has been added to "${courseName}"`,
                link: `/exercises/${exerciseId}`,
                courseId,
                exerciseId,
                fromUserId: professorId,
            });
        }
    } catch (error) {
        console.error('Error notifying new exercise:', error);
    }
};

/**
 * Notify all enrolled students in a course about a new chapter
 */
const notifyNewChapter = async ({ courseId, chapterTitle, professorId }) => {
    try {
        const enrollments = await db.query(
            'SELECT user_id FROM enrollments WHERE course_id = $1',
            [courseId]
        );

        const course = await db.query('SELECT title FROM courses WHERE id = $1', [courseId]);
        const courseName = course.rows[0]?.title || 'Unknown Course';

        for (const enrollment of enrollments.rows) {
            await createNotification({
                userId: enrollment.user_id,
                type: 'new_chapter',
                title: 'New Chapter Available',
                message: `A new chapter "${chapterTitle}" has been added to "${courseName}"`,
                link: `/my-courses/${courseId}`,
                courseId,
                fromUserId: professorId,
            });
        }
    } catch (error) {
        console.error('Error notifying new chapter:', error);
    }
};

/**
 * Notify the professor when a student completes all exercises in a course
 */
const notifyCourseCompleted = async ({ studentId, courseId }) => {
    try {
        // Get course info and professor
        const course = await db.query('SELECT title, created_by FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) return;

        const professorId = course.rows[0].created_by;
        const courseName = course.rows[0].title;

        // Get student name
        const student = await db.query('SELECT username FROM users WHERE id = $1', [studentId]);
        const studentName = student.rows[0]?.username || 'A student';

        // Check if all exercises are completed
        const totalExercises = await db.query(
            'SELECT COUNT(*) as count FROM exercises WHERE course_id = $1',
            [courseId]
        );
        const completedExercises = await db.query(
            `SELECT COUNT(*) as count FROM user_progress up
             JOIN exercises e ON up.exercise_id = e.id
             WHERE up.user_id = $1 AND e.course_id = $2 AND up.completed = true`,
            [studentId, courseId]
        );

        if (parseInt(totalExercises.rows[0].count) > 0 &&
            parseInt(completedExercises.rows[0].count) >= parseInt(totalExercises.rows[0].count)) {
            await createNotification({
                userId: professorId,
                type: 'course_completed',
                title: 'Student Completed Course',
                message: `${studentName} has completed all exercises in "${courseName}"`,
                link: `/professor/course/${courseId}/students`,
                courseId,
                fromUserId: studentId,
            });
        }
    } catch (error) {
        console.error('Error notifying course completion:', error);
    }
};

/**
 * Notify the professor when a student requests help
 */
const notifyStudentNeedsHelp = async ({ studentId, exerciseId, courseId, helpMessage }) => {
    try {
        // Get course and professor info
        const course = await db.query('SELECT title, created_by FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) return;

        const professorId = course.rows[0].created_by;
        const courseName = course.rows[0].title;

        // Get student and exercise info
        const student = await db.query('SELECT username FROM users WHERE id = $1', [studentId]);
        const exercise = await db.query('SELECT title FROM exercises WHERE id = $1', [exerciseId]);

        const studentName = student.rows[0]?.username || 'A student';
        const exerciseTitle = exercise.rows[0]?.title || 'an exercise';

        // Create help request record
        await db.query(
            `INSERT INTO help_requests (student_id, exercise_id, course_id, message)
             VALUES ($1, $2, $3, $4)`,
            [studentId, exerciseId, courseId, helpMessage || null]
        );

        await createNotification({
            userId: professorId,
            type: 'student_needs_help',
            title: 'Student Needs Help',
            message: `${studentName} is requesting help with "${exerciseTitle}" in "${courseName}"`,
            link: `/professor/course/${courseId}/students/${studentId}`,
            courseId,
            exerciseId,
            fromUserId: studentId,
        });
    } catch (error) {
        console.error('Error notifying student needs help:', error);
    }
};

/**
 * Notify professor when a student enrolls in their course
 */
const notifyNewEnrollment = async ({ studentId, courseId }) => {
    try {
        const course = await db.query('SELECT title, created_by FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) return;

        const professorId = course.rows[0].created_by;
        const courseName = course.rows[0].title;

        const student = await db.query('SELECT username FROM users WHERE id = $1', [studentId]);
        const studentName = student.rows[0]?.username || 'A student';

        await createNotification({
            userId: professorId,
            type: 'course_enrollment',
            title: 'New Student Enrolled',
            message: `${studentName} has enrolled in "${courseName}"`,
            link: `/professor/course/${courseId}/students`,
            courseId,
            fromUserId: studentId,
        });
    } catch (error) {
        console.error('Error notifying new enrollment:', error);
    }
};

module.exports = {
    registerClient,
    removeClient,
    sendToUser,
    createNotification,
    notifyNewExercise,
    notifyNewChapter,
    notifyCourseCompleted,
    notifyStudentNeedsHelp,
    notifyNewEnrollment,
};
