const {
    getStudentCourseFeedback,
    getStudentAllFeedback,
    getSingleFeedback,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    getProfessorCourseFeedback
} = require('../utils/feedbackService');
const db = require('../config/database');

// Get feedback for student (current user) in a specific course
const getMyCourseFeedback = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        const feedback = await getStudentCourseFeedback(studentId, courseId);
        res.json(feedback);
    } catch (error) {
        console.error('Get course feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all feedback for student (current user) across courses
const getMyAllFeedback = async (req, res) => {
    try {
        const studentId = req.user.id;
        const feedback = await getStudentAllFeedback(studentId);

        // Group by course for easier frontend consumption
        const grouped = {};
        feedback.forEach(f => {
            if (!grouped[f.course_id]) {
                grouped[f.course_id] = {
                    course_id: f.course_id,
                    course_title: f.course_title,
                    feedback: []
                };
            }
            grouped[f.course_id].feedback.push(f);
        });

        res.json(Object.values(grouped));
    } catch (error) {
        console.error('Get all feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Send feedback to a student (professor only)
const sendFeedback = async (req, res) => {
    try {
        const { studentId, courseId, feedback_text, feedback_category = 'general', is_positive } = req.body;
        const professorId = req.user.id;

        // Validation
        if (!studentId || !courseId || !feedback_text) {
            return res.status(400).json({ error: 'Student ID, course ID, and feedback text are required' });
        }

        // Verify professor is creator of the course
        const course = await db.query('SELECT created_by FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].created_by !== professorId) {
            return res.status(403).json({ error: 'You can only send feedback for your own courses' });
        }

        // Verify student exists and is enrolled in course
        const enrollment = await db.query(
            'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [studentId, courseId]
        );
        if (enrollment.rows.length === 0) {
            return res.status(404).json({ error: 'Student is not enrolled in this course' });
        }

        const feedback = await createFeedback(studentId, courseId, professorId, feedback_text, feedback_category, is_positive);
        res.status(201).json(feedback);
    } catch (error) {
        console.error('Send feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update feedback (professor who created it)
const updateMyFeedback = async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const { feedback_text, feedback_category = 'general', is_positive } = req.body;
        const professorId = req.user.id;

        if (!feedback_text) {
            return res.status(400).json({ error: 'Feedback text is required' });
        }

        const feedback = await updateFeedback(feedbackId, feedback_text, feedback_category, is_positive, professorId);
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found or you do not have permission to update it' });
        }

        res.json(feedback);
    } catch (error) {
        console.error('Update feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete feedback (professor only)
const deleteMyFeedback = async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const professorId = req.user.id;

        const success = await deleteFeedback(feedbackId, professorId);
        if (!success) {
            return res.status(404).json({ error: 'Feedback not found or you do not have permission to delete it' });
        }

        res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all feedback sent by professor
const getProfessorFeedback = async (req, res) => {
    try {
        const { courseId } = req.query;
        const professorId = req.user.id;

        if (courseId) {
            // Verify course belongs to professor
            const course = await db.query('SELECT created_by FROM courses WHERE id = $1', [courseId]);
            if (course.rows.length === 0 || course.rows[0].created_by !== professorId) {
                return res.status(403).json({ error: 'You can only view feedback for your own courses' });
            }

            const feedback = await getProfessorCourseFeedback(courseId, professorId);
            return res.json(feedback);
        }

        // Get all feedback for all professor's courses
        const feedback = await db.query(
            `SELECT sf.id, sf.student_id, sf.feedback_text, sf.feedback_category, sf.is_positive,
                    sf.created_at, sf.updated_at,
                    u.username as student_name,
                    c.id as course_id, c.title as course_title
             FROM student_feedback sf
             JOIN users u ON sf.student_id = u.id
             JOIN courses c ON sf.course_id = c.id
             WHERE sf.professor_id = $1
             ORDER BY c.id DESC, sf.created_at DESC`,
            [professorId]
        );
        res.json(feedback.rows);
    } catch (error) {
        console.error('Get professor feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getMyCourseFeedback,
    getMyAllFeedback,
    sendFeedback,
    updateMyFeedback,
    deleteMyFeedback,
    getProfessorFeedback
};
