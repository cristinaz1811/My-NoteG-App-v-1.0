const db = require('../config/database');

// Get all feedback for a student in a specific course
const getStudentCourseFeedback = async (studentId, courseId) => {
    const result = await db.query(
        `SELECT sf.id, sf.feedback_text, sf.feedback_category, sf.is_positive,
                sf.created_at, sf.updated_at,
                u.username as professor_name, u.id as professor_id,
                c.title as course_title
         FROM student_feedback sf
         JOIN users u ON sf.professor_id = u.id
         JOIN courses c ON sf.course_id = c.id
         WHERE sf.student_id = $1 AND sf.course_id = $2
         ORDER BY sf.created_at DESC`,
        [studentId, courseId]
    );
    return result.rows;
};

// Get all feedback for a student (across all courses)
const getStudentAllFeedback = async (studentId) => {
    const result = await db.query(
        `SELECT sf.id, sf.feedback_text, sf.feedback_category, sf.is_positive,
                sf.created_at, sf.updated_at,
                u.username as professor_name, u.id as professor_id,
                c.title as course_title, c.id as course_id
         FROM student_feedback sf
         JOIN users u ON sf.professor_id = u.id
         JOIN courses c ON sf.course_id = c.id
         WHERE sf.student_id = $1
         ORDER BY c.id DESC, sf.created_at DESC`,
        [studentId]
    );
    return result.rows;
};

// Get feedback from professor to a student in a course
const getSingleFeedback = async (feedbackId, studentId) => {
    const result = await db.query(
        `SELECT sf.id, sf.feedback_text, sf.feedback_category, sf.is_positive,
                sf.created_at, sf.updated_at,
                u.username as professor_name, u.id as professor_id,
                c.title as course_title, c.id as course_id
         FROM student_feedback sf
         JOIN users u ON sf.professor_id = u.id
         JOIN courses c ON sf.course_id = c.id
         WHERE sf.id = $1 AND sf.student_id = $2`,
        [feedbackId, studentId]
    );
    return result.rows[0];
};

// Create feedback from professor to student
const createFeedback = async (studentId, courseId, professorId, feedbackText, category = 'general', isPositive = null) => {
    const result = await db.query(
        `INSERT INTO student_feedback (student_id, course_id, professor_id, feedback_text, feedback_category, is_positive)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, student_id, course_id, professor_id, feedback_text, feedback_category, is_positive, created_at, updated_at`,
        [studentId, courseId, professorId, feedbackText, category, isPositive]
    );
    return result.rows[0];
};

// Update feedback
const updateFeedback = async (feedbackId, feedbackText, category, isPositive, professorId) => {
    const result = await db.query(
        `UPDATE student_feedback
         SET feedback_text = $1, feedback_category = $2, is_positive = $3, updated_at = NOW()
         WHERE id = $4 AND professor_id = $5
         RETURNING id, student_id, course_id, professor_id, feedback_text, feedback_category, is_positive, created_at, updated_at`,
        [feedbackText, category, isPositive, feedbackId, professorId]
    );
    return result.rows[0];
};

// Delete feedback (professor only)
const deleteFeedback = async (feedbackId, professorId) => {
    const result = await db.query(
        'DELETE FROM student_feedback WHERE id = $1 AND professor_id = $2 RETURNING id',
        [feedbackId, professorId]
    );
    return result.rows.length > 0;
};

// Get feedback for professor's students in a course
const getProfessorCourseFeedback = async (courseId, professorId) => {
    const result = await db.query(
        `SELECT sf.id, sf.student_id, sf.feedback_text, sf.feedback_category, sf.is_positive,
                sf.created_at, sf.updated_at,
                u.username as student_name,
                c.title as course_title
         FROM student_feedback sf
         JOIN users u ON sf.student_id = u.id
         JOIN courses c ON sf.course_id = c.id
         WHERE sf.course_id = $1 AND sf.professor_id = $2
         ORDER BY sf.created_at DESC`,
        [courseId, professorId]
    );
    return result.rows;
};

// Get summary of feedback for a student (used by AI coach)
const getFeedbackSummaryForAI = async (studentId) => {
    const result = await db.query(
        `SELECT sf.feedback_category, sf.is_positive, COUNT(*) as count,
                STRING_AGG(sf.feedback_text, ' | ' ORDER BY sf.created_at DESC) as feedback_samples,
                STRING_AGG(DISTINCT c.title, ', ') as courses
         FROM student_feedback sf
         JOIN courses c ON sf.course_id = c.id
         WHERE sf.student_id = $1
         GROUP BY sf.feedback_category, sf.is_positive`,
        [studentId]
    );
    return result.rows;
};

module.exports = {
    getStudentCourseFeedback,
    getStudentAllFeedback,
    getSingleFeedback,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    getProfessorCourseFeedback,
    getFeedbackSummaryForAI
};
