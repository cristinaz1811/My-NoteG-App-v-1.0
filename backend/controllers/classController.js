const crypto = require('crypto');
const db = require('../config/database');
const { notifyClassEnrollmentRequest, notifyEnrollmentDecision } = require('../utils/notificationService');
const { sendEnrollmentRequestEmail, sendEnrollmentDecisionEmail } = require('../utils/emailService');

const generateAccessKey = () => crypto.randomBytes(4).toString('hex').toUpperCase();

// ─── helpers ────────────────────────────────────────────────────────────────

// Enroll a user in every course that belongs to a class (idempotent)
const enrollUserInClassCourses = async (userId, classId) => {
    const courses = await db.query(
        'SELECT id FROM courses WHERE class_id = $1', [classId]
    );
    for (const c of courses.rows) {
        await db.query(
            `INSERT INTO enrollments (user_id, course_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, c.id]
        );
    }
};

// When a course is added to a class, auto-enroll all approved class members
const enrollApprovedMembersInCourse = async (courseId, classId) => {
    await db.query(
        `INSERT INTO enrollments (user_id, course_id)
         SELECT ce.user_id, $1
         FROM class_enrollments ce
         WHERE ce.class_id = $2 AND ce.status = 'approved'
         ON CONFLICT DO NOTHING`,
        [courseId, classId]
    );
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

const getClassById = async (req, res) => {
    try {
        const { classId } = req.params;

        const classResult = await db.query(
            `SELECT cl.*,
                    cy.name AS year_name, cy.id AS year_id,
                    cy.faculty, cy.school_year,
                    u.username AS created_by_name
             FROM classes cl
             JOIN college_years cy ON cy.id = cl.year_id
             LEFT JOIN users u ON u.id = cl.created_by
             WHERE cl.id = $1`,
            [classId]
        );
        if (classResult.rows.length === 0) return res.status(404).json({ error: 'Class not found' });

        const coursesResult = await db.query(
            `SELECT co.*, u.username AS professor_name
             FROM courses co
             LEFT JOIN users u ON u.id = co.created_by
             WHERE co.class_id = $1
             ORDER BY co.order_index, co.id`,
            [classId]
        );

        res.json({ ...classResult.rows[0], courses: coursesResult.rows });
    } catch (err) {
        console.error('getClassById error:', err);
        res.status(500).json({ error: 'Failed to fetch class' });
    }
};

const updateClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { name, description, order_index } = req.body;

        const check = await db.query('SELECT * FROM classes WHERE id = $1', [classId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Class not found' });

        const result = await db.query(
            `UPDATE classes
             SET name        = COALESCE($1, name),
                 description = COALESCE($2, description),
                 order_index = COALESCE($3, order_index)
             WHERE id = $4 RETURNING *`,
            [name, description, order_index, classId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('updateClass error:', err);
        res.status(500).json({ error: 'Failed to update class' });
    }
};

const deleteClass = async (req, res) => {
    try {
        const { classId } = req.params;

        const courseCount = await db.query(
            'SELECT COUNT(*) FROM courses WHERE class_id = $1', [classId]
        );
        if (parseInt(courseCount.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot delete a class that still has courses assigned to it' });
        }

        await db.query('DELETE FROM classes WHERE id = $1', [classId]);
        res.json({ message: 'Class deleted' });
    } catch (err) {
        console.error('deleteClass error:', err);
        res.status(500).json({ error: 'Failed to delete class' });
    }
};

// ─── Enrollment ───────────────────────────────────────────────────────────────

// GET /api/classes/:classId/enrollment-status  (student)
const getEnrollmentStatus = async (req, res) => {
    try {
        const { classId } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            'SELECT status FROM class_enrollments WHERE user_id = $1 AND class_id = $2',
            [userId, classId]
        );
        if (result.rows.length === 0) return res.json({ status: 'none' });
        res.json({ status: result.rows[0].status });
    } catch (err) {
        console.error('getEnrollmentStatus error:', err);
        res.status(500).json({ error: 'Failed to check enrollment' });
    }
};

// POST /api/classes/:classId/enroll  — request or access-key enroll
const requestEnrollment = async (req, res) => {
    try {
        const { classId } = req.params;
        const { access_key } = req.body || {};
        const userId = req.user.id;

        // Already enrolled?
        const existing = await db.query(
            'SELECT status FROM class_enrollments WHERE user_id = $1 AND class_id = $2',
            [userId, classId]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ status: existing.rows[0].status, error: 'Already submitted a request for this class' });
        }

        const classRow = await db.query('SELECT * FROM classes WHERE id = $1', [classId]);
        if (classRow.rows.length === 0) return res.status(404).json({ error: 'Class not found' });

        const cls = classRow.rows[0];

        if (access_key) {
            if (!cls.access_key || access_key.toUpperCase() !== cls.access_key) {
                return res.status(403).json({ error: 'Invalid access key' });
            }
            // Approve immediately
            await db.query(
                `INSERT INTO class_enrollments (user_id, class_id, status, approved_at)
                 VALUES ($1, $2, 'approved', NOW())`,
                [userId, classId]
            );
            await enrollUserInClassCourses(userId, classId);
            return res.json({ status: 'approved', message: 'Enrolled successfully' });
        }

        // Request approval
        await db.query(
            `INSERT INTO class_enrollments (user_id, class_id, status)
             VALUES ($1, $2, 'pending')`,
            [userId, classId]
        );

        // Fetch class + year info for notification content
        const info = await db.query(
            `SELECT cl.name AS class_name, cy.name AS year_name, cy.faculty,
                    cl.created_by AS professor_id, u.email AS professor_email, u.username AS professor_name
             FROM classes cl
             JOIN college_years cy ON cy.id = cl.year_id
             JOIN users u ON u.id = cl.created_by
             WHERE cl.id = $1`,
            [classId]
        );
        if (info.rows.length > 0) {
            const { class_name, year_name, faculty, professor_email, professor_name } = info.rows[0];
            // Fire-and-forget — don't block the response on these
            notifyClassEnrollmentRequest({
                studentId: userId, classId, className: class_name, yearName: year_name, faculty,
            }).catch(() => {});
            sendEnrollmentRequestEmail(professor_email, professor_name, req.user.username, class_name, year_name, faculty)
                .catch(() => {});
        }

        res.status(201).json({ status: 'pending', message: 'Enrollment request sent' });
    } catch (err) {
        console.error('requestEnrollment error:', err);
        res.status(500).json({ error: 'Failed to process enrollment' });
    }
};

// GET /api/classes/:classId/enrollment-requests  (professor)
const getEnrollmentRequests = async (req, res) => {
    try {
        const { classId } = req.params;
        const result = await db.query(
            `SELECT ce.*, u.username, u.email, u.avatar_url
             FROM class_enrollments ce
             JOIN users u ON u.id = ce.user_id
             WHERE ce.class_id = $1
             ORDER BY ce.status, ce.enrolled_at DESC`,
            [classId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('getEnrollmentRequests error:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
};

// PUT /api/classes/:classId/enrollment-requests/:userId/approve
const approveEnrollment = async (req, res) => {
    try {
        const { classId, userId } = req.params;

        const result = await db.query(
            `UPDATE class_enrollments
             SET status = 'approved', approved_at = NOW(), approved_by = $1
             WHERE class_id = $2 AND user_id = $3 AND status = 'pending'
             RETURNING *`,
            [req.user.id, classId, userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Pending request not found' });

        await enrollUserInClassCourses(parseInt(userId), parseInt(classId));

        // Notify student
        const info = await db.query(
            `SELECT cl.name AS class_name, cy.name AS year_name, cy.faculty,
                    u.email AS student_email, u.username AS student_name
             FROM classes cl JOIN college_years cy ON cy.id = cl.year_id
             JOIN users u ON u.id = $1
             WHERE cl.id = $2`,
            [userId, classId]
        );
        if (info.rows.length > 0) {
            const { class_name, year_name, faculty, student_email, student_name } = info.rows[0];
            notifyEnrollmentDecision({ studentId: parseInt(userId), classId, className: class_name, yearName: year_name, faculty, approved: true }).catch(() => {});
            sendEnrollmentDecisionEmail(student_email, student_name, class_name, year_name, faculty, true).catch(() => {});
        }

        res.json({ message: 'Approved', enrollment: result.rows[0] });
    } catch (err) {
        console.error('approveEnrollment error:', err);
        res.status(500).json({ error: 'Failed to approve' });
    }
};

// PUT /api/classes/:classId/enrollment-requests/:userId/reject
const rejectEnrollment = async (req, res) => {
    try {
        const { classId, userId } = req.params;

        const result = await db.query(
            `UPDATE class_enrollments
             SET status = 'rejected'
             WHERE class_id = $1 AND user_id = $2 AND status = 'pending'
             RETURNING *`,
            [classId, userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Pending request not found' });

        // Notify student
        const info = await db.query(
            `SELECT cl.name AS class_name, cy.name AS year_name, cy.faculty,
                    u.email AS student_email, u.username AS student_name
             FROM classes cl JOIN college_years cy ON cy.id = cl.year_id
             JOIN users u ON u.id = $1
             WHERE cl.id = $2`,
            [userId, classId]
        );
        if (info.rows.length > 0) {
            const { class_name, year_name, faculty, student_email, student_name } = info.rows[0];
            notifyEnrollmentDecision({ studentId: parseInt(userId), classId, className: class_name, yearName: year_name, faculty, approved: false }).catch(() => {});
            sendEnrollmentDecisionEmail(student_email, student_name, class_name, year_name, faculty, false).catch(() => {});
        }

        res.json({ message: 'Rejected' });
    } catch (err) {
        console.error('rejectEnrollment error:', err);
        res.status(500).json({ error: 'Failed to reject' });
    }
};

// GET /api/classes/all-enrollment-requests  (professor — across all their classes)
const getAllEnrollmentRequests = async (req, res) => {
    try {
        const professorId = req.user.id;
        const { status } = req.query; // optional filter: pending | approved | rejected

        const statusFilter = status ? `AND ce.status = $2` : '';
        const params = status ? [professorId, status] : [professorId];

        const result = await db.query(
            `SELECT ce.*,
                    u.username AS student_name, u.email AS student_email, u.avatar_url,
                    cl.name AS class_name, cl.id AS class_id,
                    cy.name AS year_name, cy.faculty, cy.school_year
             FROM class_enrollments ce
             JOIN users u ON u.id = ce.user_id
             JOIN classes cl ON cl.id = ce.class_id
             JOIN college_years cy ON cy.id = cl.year_id
             WHERE cl.created_by = $1 ${statusFilter}
             ORDER BY ce.status = 'pending' DESC, ce.enrolled_at DESC`,
            params
        );
        res.json(result.rows);
    } catch (err) {
        console.error('getAllEnrollmentRequests error:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
};

// POST /api/classes/:classId/regenerate-key  (professor)
const regenerateAccessKey = async (req, res) => {
    try {
        const { classId } = req.params;
        let key;
        for (let i = 0; i < 10; i++) {
            key = generateAccessKey();
            const dup = await db.query('SELECT id FROM classes WHERE access_key = $1', [key]);
            if (dup.rows.length === 0) break;
        }
        const result = await db.query(
            'UPDATE classes SET access_key = $1 WHERE id = $2 RETURNING access_key',
            [key, classId]
        );
        res.json({ access_key: result.rows[0].access_key });
    } catch (err) {
        console.error('regenerateAccessKey error:', err);
        res.status(500).json({ error: 'Failed to regenerate key' });
    }
};

// GET /api/classes/:classId/students  (professor) - approved students for event targeting
const getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;
        const result = await db.query(
            `SELECT u.id, u.username, u.email, u.avatar_url
             FROM class_enrollments ce
             JOIN users u ON u.id = ce.user_id
             WHERE ce.class_id = $1 AND ce.status = 'approved'
             ORDER BY u.username`,
            [classId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('getClassStudents error:', err);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
};

module.exports = {
    getClassById,
    updateClass,
    deleteClass,
    getEnrollmentStatus,
    requestEnrollment,
    getEnrollmentRequests,
    getAllEnrollmentRequests,
    approveEnrollment,
    rejectEnrollment,
    regenerateAccessKey,
    enrollApprovedMembersInCourse,
    getClassStudents,
};
