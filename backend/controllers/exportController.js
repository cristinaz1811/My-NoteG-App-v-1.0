const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const db = require('../config/database');

// ─── Helper: fetch grades for all students in a course (professor view) ────
const fetchCourseGrades = async (courseId, professorId, role) => {
    // Verify ownership
    const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (course.rows.length === 0) throw { status: 404, message: 'Course not found' };
    if (course.rows[0].created_by !== professorId && role !== 'admin') {
        throw { status: 403, message: 'Not authorized' };
    }

    const students = await db.query(`
        SELECT 
            u.id,
            u.username,
            u.email,
            e.enrolled_at,
            e.progress,
            COUNT(DISTINCT ex.id) as total_exercises,
            COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as completed_exercises,
            COALESCE(sub_stats.total_attempts, 0) as total_attempts,
            COALESCE(sub_stats.avg_score, 0) as average_score,
            COALESCE(sub_stats.last_submission, NULL) as last_activity,
            COALESCE(time_stats.total_time, 0) as total_time_spent
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        LEFT JOIN exercises ex ON ex.course_id = e.course_id
        LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = e.user_id
        LEFT JOIN (
            SELECT 
                s.user_id,
                COUNT(s.id) as total_attempts,
                ROUND(AVG(s.score)::numeric, 2) as avg_score,
                MAX(s.submitted_at) as last_submission
            FROM submissions s
            JOIN exercises ex2 ON s.exercise_id = ex2.id
            WHERE ex2.course_id = $1
            GROUP BY s.user_id
        ) sub_stats ON u.id = sub_stats.user_id
        LEFT JOIN (
            SELECT 
                user_id,
                SUM(CASE 
                    WHEN duration IS NOT NULL THEN duration
                    ELSE EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::integer
                END) as total_time
            FROM course_time_sessions
            WHERE course_id = $1 AND started_at IS NOT NULL
            GROUP BY user_id
        ) time_stats ON u.id = time_stats.user_id
        WHERE e.course_id = $1
        GROUP BY u.id, u.username, u.email, e.enrolled_at, e.progress,
                 sub_stats.total_attempts, sub_stats.avg_score, sub_stats.last_submission,
                 time_stats.total_time
        ORDER BY u.username
    `, [courseId]);

    return { course: course.rows[0], students: students.rows };
};

// ─── Helper: fetch a single student's own progress across enrolled courses ──
const fetchStudentProgress = async (userId) => {
    const result = await db.query(`
        SELECT 
            c.id as course_id,
            c.title as course_title,
            c.difficulty as course_difficulty,
            e.enrolled_at,
            COUNT(DISTINCT ex.id) as total_exercises,
            COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as completed_exercises,
            COALESCE(sub_stats.total_attempts, 0) as total_attempts,
            COALESCE(sub_stats.avg_score, 0) as average_score,
            COALESCE(sub_stats.last_submission, NULL) as last_activity,
            COALESCE(time_stats.total_time, 0) as total_time_spent
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN exercises ex ON ex.course_id = c.id
        LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = e.user_id
        LEFT JOIN (
            SELECT 
                s.user_id,
                ex2.course_id,
                COUNT(s.id) as total_attempts,
                ROUND(AVG(s.score)::numeric, 2) as avg_score,
                MAX(s.submitted_at) as last_submission
            FROM submissions s
            JOIN exercises ex2 ON s.exercise_id = ex2.id
            GROUP BY s.user_id, ex2.course_id
        ) sub_stats ON sub_stats.user_id = e.user_id AND sub_stats.course_id = c.id
        LEFT JOIN (
            SELECT 
                user_id,
                course_id,
                SUM(CASE 
                    WHEN duration IS NOT NULL THEN duration
                    ELSE EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::integer
                END) as total_time
            FROM course_time_sessions
            WHERE started_at IS NOT NULL
            GROUP BY user_id, course_id
        ) time_stats ON time_stats.user_id = e.user_id AND time_stats.course_id = c.id
        WHERE e.user_id = $1
        GROUP BY c.id, c.title, c.difficulty, e.enrolled_at,
                 sub_stats.total_attempts, sub_stats.avg_score, sub_stats.last_submission,
                 time_stats.total_time
        ORDER BY c.title
    `, [userId]);

    // Also fetch per-exercise details
    const exercises = await db.query(`
        SELECT 
            c.title as course_title,
            ex.title as exercise_title,
            ex.difficulty,
            ex.language,
            ch.title as chapter_title,
            COALESCE(up.completed, false) as completed,
            COALESCE(up.best_score, 0) as best_score,
            COALESCE(up.attempts, 0) as attempts,
            up.last_attempt_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN exercises ex ON ex.course_id = c.id
        LEFT JOIN chapters ch ON ex.chapter_id = ch.id
        LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = e.user_id
        WHERE e.user_id = $1
        ORDER BY c.title, ch.order_index, ex.order_index, ex.id
    `, [userId]);

    const user = await db.query('SELECT id, username, email FROM users WHERE id = $1', [userId]);

    return {
        user: user.rows[0],
        courses: result.rows,
        exercises: exercises.rows,
    };
};

// ─── Formatting helpers ─────────────────────────────────────────────────────
const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    const s = parseInt(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fmtPercent = (completed, total) => {
    const t = parseInt(total) || 0;
    const c = parseInt(completed) || 0;
    if (t === 0) return '0%';
    return `${Math.round((c / t) * 100)}%`;
};

// ============================================================================
//  PROFESSOR: Export course grades
// ============================================================================

// CSV — professor exports all student grades for a course
const exportCourseGradesCSV = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { course, students } = await fetchCourseGrades(courseId, req.user.id, req.user.role);

        const rows = students.map((s) => ({
            Username: s.username,
            Email: s.email,
            'Enrolled Date': fmtDate(s.enrolled_at),
            'Completed Exercises': `${s.completed_exercises}/${s.total_exercises}`,
            'Progress': fmtPercent(s.completed_exercises, s.total_exercises),
            'Average Score': `${parseFloat(s.average_score || 0).toFixed(1)}%`,
            'Total Attempts': s.total_attempts,
            'Time Spent': formatTime(s.total_time_spent),
            'Last Activity': fmtDate(s.last_activity),
        }));

        const parser = new Parser();
        const csv = parser.parse(rows);

        const filename = `${course.title.replace(/[^a-z0-9]/gi, '_')}_grades.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Export course grades CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PDF — professor exports all student grades for a course
const exportCourseGradesPDF = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { course, students } = await fetchCourseGrades(courseId, req.user.id, req.user.role);

        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
        const filename = `${course.title.replace(/[^a-z0-9]/gi, '_')}_grades.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // Title
        doc.fontSize(20).font('Helvetica-Bold').text(course.title, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).font('Helvetica').fillColor('#666666')
            .text(`Student Grades Report — Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).text(`Total students: ${students.length}`, { align: 'center' });
        doc.moveDown(1);

        // Table header
        const tableTop = doc.y;
        const cols = [
            { label: 'Student', x: 40, width: 130 },
            { label: 'Email', x: 170, width: 160 },
            { label: 'Enrolled', x: 330, width: 80 },
            { label: 'Progress', x: 410, width: 70 },
            { label: 'Avg Score', x: 480, width: 65 },
            { label: 'Attempts', x: 545, width: 60 },
            { label: 'Time Spent', x: 605, width: 70 },
            { label: 'Last Active', x: 675, width: 85 },
        ];

        // Header row background
        doc.rect(40, tableTop - 3, 720, 18).fill('#a1609d');
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        cols.forEach((c) => doc.text(c.label, c.x, tableTop, { width: c.width }));

        // Rows
        let y = tableTop + 20;
        doc.font('Helvetica').fontSize(8).fillColor('#333333');

        students.forEach((s, i) => {
            if (y > 540) {
                doc.addPage();
                y = 40;
                // Reprint header
                doc.rect(40, y - 3, 720, 18).fill('#a1609d');
                doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
                cols.forEach((c) => doc.text(c.label, c.x, y, { width: c.width }));
                y += 20;
                doc.font('Helvetica').fontSize(8).fillColor('#333333');
            }

            // Alternate row bg
            if (i % 2 === 0) doc.rect(40, y - 2, 720, 16).fill('#f8f4f9');
            doc.fillColor('#333333');

            doc.text(s.username, cols[0].x, y, { width: cols[0].width });
            doc.text(s.email, cols[1].x, y, { width: cols[1].width });
            doc.text(fmtDate(s.enrolled_at), cols[2].x, y, { width: cols[2].width });
            doc.text(`${s.completed_exercises}/${s.total_exercises} (${fmtPercent(s.completed_exercises, s.total_exercises)})`, cols[3].x, y, { width: cols[3].width });
            doc.text(`${parseFloat(s.average_score || 0).toFixed(1)}%`, cols[4].x, y, { width: cols[4].width });
            doc.text(String(s.total_attempts), cols[5].x, y, { width: cols[5].width });
            doc.text(formatTime(s.total_time_spent), cols[6].x, y, { width: cols[6].width });
            doc.text(fmtDate(s.last_activity), cols[7].x, y, { width: cols[7].width });
            y += 18;
        });

        doc.end();
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Export course grades PDF error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
//  STUDENT: Export own progress
// ============================================================================

// CSV — student exports own records
const exportStudentProgressCSV = async (req, res) => {
    try {
        const { exercises, user } = await fetchStudentProgress(req.user.id);

        // Build per-exercise rows
        const rows = exercises.map((ex) => ({
            Course: ex.course_title,
            Chapter: ex.chapter_title || '-',
            Exercise: ex.exercise_title,
            Difficulty: ex.difficulty,
            Language: ex.language,
            Completed: ex.completed ? 'Yes' : 'No',
            'Best Score': `${parseFloat(ex.best_score || 0).toFixed(1)}%`,
            Attempts: ex.attempts,
            'Last Attempt': fmtDate(ex.last_attempt_at),
        }));

        const parser = new Parser();
        const csv = parser.parse(rows.length > 0 ? rows : [{ Note: 'No exercise data yet' }]);

        const filename = `${user.username}_progress.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) {
        console.error('Export student progress CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PDF — student exports own records
const exportStudentProgressPDF = async (req, res) => {
    try {
        const { courses, exercises, user } = await fetchStudentProgress(req.user.id);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const filename = `${user.username}_progress.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // Title
        doc.fontSize(22).font('Helvetica-Bold').text('My Progress Report', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#666666')
            .text(`${user.username} — ${user.email}`, { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(10).text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
        doc.moveDown(1.5);

        // ── Course summary section ──
        doc.fillColor('#333333').fontSize(14).font('Helvetica-Bold').text('Course Summary');
        doc.moveDown(0.5);

        courses.forEach((c) => {
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#a1609d')
                .text(c.course_title);
            doc.fontSize(9).font('Helvetica').fillColor('#555555')
                .text(`Difficulty: ${c.course_difficulty || '-'}  |  Enrolled: ${fmtDate(c.enrolled_at)}  |  Progress: ${c.completed_exercises}/${c.total_exercises} (${fmtPercent(c.completed_exercises, c.total_exercises)})  |  Avg Score: ${parseFloat(c.average_score || 0).toFixed(1)}%  |  Time: ${formatTime(c.total_time_spent)}`);
            doc.moveDown(0.6);
        });

        if (courses.length === 0) {
            doc.fontSize(10).fillColor('#999999').text('No courses enrolled yet.');
        }

        doc.moveDown(1);

        // ── Exercise detail table ──
        doc.fillColor('#333333').fontSize(14).font('Helvetica-Bold').text('Exercise Details');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const cols = [
            { label: 'Course', x: 40, width: 110 },
            { label: 'Exercise', x: 150, width: 130 },
            { label: 'Difficulty', x: 280, width: 60 },
            { label: 'Completed', x: 340, width: 60 },
            { label: 'Best Score', x: 400, width: 60 },
            { label: 'Attempts', x: 460, width: 50 },
            { label: 'Last Attempt', x: 510, width: 60 },
        ];

        // Header
        doc.rect(40, tableTop - 3, 530, 18).fill('#a1609d');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        cols.forEach((c) => doc.text(c.label, c.x, tableTop, { width: c.width }));

        let y = tableTop + 20;
        doc.font('Helvetica').fontSize(7).fillColor('#333333');

        exercises.forEach((ex, i) => {
            if (y > 760) {
                doc.addPage();
                y = 40;
                doc.rect(40, y - 3, 530, 18).fill('#a1609d');
                doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
                cols.forEach((c) => doc.text(c.label, c.x, y, { width: c.width }));
                y += 20;
                doc.font('Helvetica').fontSize(7).fillColor('#333333');
            }

            if (i % 2 === 0) doc.rect(40, y - 2, 530, 14).fill('#f8f4f9');
            doc.fillColor('#333333');

            doc.text(ex.course_title, cols[0].x, y, { width: cols[0].width });
            doc.text(ex.exercise_title, cols[1].x, y, { width: cols[1].width });
            doc.text(ex.difficulty, cols[2].x, y, { width: cols[2].width });
            doc.text(ex.completed ? 'Yes' : 'No', cols[3].x, y, { width: cols[3].width });
            doc.text(`${parseFloat(ex.best_score || 0).toFixed(1)}%`, cols[4].x, y, { width: cols[4].width });
            doc.text(String(ex.attempts), cols[5].x, y, { width: cols[5].width });
            doc.text(fmtDate(ex.last_attempt_at), cols[6].x, y, { width: cols[6].width });
            y += 16;
        });

        if (exercises.length === 0) {
            doc.fontSize(10).fillColor('#999999').text('No exercise data yet.', 40, y + 10);
        }

        doc.end();
    } catch (error) {
        console.error('Export student progress PDF error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
//  PROFESSOR: Export a single student's detailed report
// ============================================================================

const exportStudentDetailCSV = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const student = await db.query('SELECT id, username, email FROM users WHERE id = $1', [studentId]);
        if (student.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

        const exercises = await db.query(`
            SELECT 
                ex.title as exercise_title,
                ex.difficulty,
                ex.language,
                ch.title as chapter_title,
                COALESCE(up.completed, false) as completed,
                COALESCE(up.best_score, 0) as best_score,
                COALESCE(up.attempts, 0) as attempts,
                up.last_attempt_at
            FROM exercises ex
            LEFT JOIN chapters ch ON ex.chapter_id = ch.id
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = $1
            WHERE ex.course_id = $2
            ORDER BY ch.order_index, ex.order_index, ex.id
        `, [studentId, courseId]);

        const rows = exercises.rows.map((ex) => ({
            Chapter: ex.chapter_title || '-',
            Exercise: ex.exercise_title,
            Difficulty: ex.difficulty,
            Language: ex.language,
            Completed: ex.completed ? 'Yes' : 'No',
            'Best Score': `${parseFloat(ex.best_score || 0).toFixed(1)}%`,
            Attempts: ex.attempts,
            'Last Attempt': fmtDate(ex.last_attempt_at),
        }));

        const parser = new Parser();
        const csv = parser.parse(rows.length > 0 ? rows : [{ Note: 'No data' }]);

        const filename = `${student.rows[0].username}_${course.rows[0].title.replace(/[^a-z0-9]/gi, '_')}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) {
        console.error('Export student detail CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const exportStudentDetailPDF = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const student = await db.query('SELECT id, username, email FROM users WHERE id = $1', [studentId]);
        if (student.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

        const exercises = await db.query(`
            SELECT 
                ex.title as exercise_title,
                ex.difficulty,
                ex.language,
                ch.title as chapter_title,
                COALESCE(up.completed, false) as completed,
                COALESCE(up.best_score, 0) as best_score,
                COALESCE(up.attempts, 0) as attempts,
                up.last_attempt_at
            FROM exercises ex
            LEFT JOIN chapters ch ON ex.chapter_id = ch.id
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = $1
            WHERE ex.course_id = $2
            ORDER BY ch.order_index, ex.order_index, ex.id
        `, [studentId, courseId]);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const filename = `${student.rows[0].username}_${course.rows[0].title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // Title
        doc.fontSize(20).font('Helvetica-Bold').text(`Student Report`, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).font('Helvetica').fillColor('#666666')
            .text(`${student.rows[0].username} (${student.rows[0].email})`, { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).fillColor('#a1609d').font('Helvetica-Bold')
            .text(course.rows[0].title, { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica').fillColor('#999999')
            .text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
        doc.moveDown(1.5);

        // Table
        const tableTop = doc.y;
        const cols = [
            { label: 'Chapter', x: 40, width: 100 },
            { label: 'Exercise', x: 140, width: 140 },
            { label: 'Difficulty', x: 280, width: 60 },
            { label: 'Completed', x: 340, width: 60 },
            { label: 'Best Score', x: 400, width: 60 },
            { label: 'Attempts', x: 460, width: 50 },
            { label: 'Last Attempt', x: 510, width: 60 },
        ];

        doc.rect(40, tableTop - 3, 530, 18).fill('#a1609d');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        cols.forEach((c) => doc.text(c.label, c.x, tableTop, { width: c.width }));

        let y = tableTop + 20;
        doc.font('Helvetica').fontSize(7).fillColor('#333333');

        exercises.rows.forEach((ex, i) => {
            if (y > 760) {
                doc.addPage();
                y = 40;
                doc.rect(40, y - 3, 530, 18).fill('#a1609d');
                doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
                cols.forEach((c) => doc.text(c.label, c.x, y, { width: c.width }));
                y += 20;
                doc.font('Helvetica').fontSize(7).fillColor('#333333');
            }

            if (i % 2 === 0) doc.rect(40, y - 2, 530, 14).fill('#f8f4f9');
            doc.fillColor('#333333');

            doc.text(ex.chapter_title || '-', cols[0].x, y, { width: cols[0].width });
            doc.text(ex.exercise_title, cols[1].x, y, { width: cols[1].width });
            doc.text(ex.difficulty, cols[2].x, y, { width: cols[2].width });
            doc.text(ex.completed ? 'Yes' : 'No', cols[3].x, y, { width: cols[3].width });
            doc.text(`${parseFloat(ex.best_score || 0).toFixed(1)}%`, cols[4].x, y, { width: cols[4].width });
            doc.text(String(ex.attempts), cols[5].x, y, { width: cols[5].width });
            doc.text(fmtDate(ex.last_attempt_at), cols[6].x, y, { width: cols[6].width });
            y += 16;
        });

        if (exercises.rows.length === 0) {
            doc.fontSize(10).fillColor('#999999').text('No exercise data yet.', 40, y + 10);
        }

        doc.end();
    } catch (error) {
        console.error('Export student detail PDF error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    exportCourseGradesCSV,
    exportCourseGradesPDF,
    exportStudentProgressCSV,
    exportStudentProgressPDF,
    exportStudentDetailCSV,
    exportStudentDetailPDF,
};
