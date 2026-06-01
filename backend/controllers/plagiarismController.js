const db = require('../config/database');
const { compareSubmissions } = require('../utils/plagiarismDetector');
const { enqueuePlagiarism } = require('../utils/queueService');
const { DISTRIBUTED_MODE } = require('../utils/redisClient');

// ─── Run plagiarism scan for an exercise ────────────────────────────────────
const runPlagiarismScan = async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const { threshold = 70 } = req.body;
        const professorId = req.user.id;

        const exerciseCheck = await db.query(`
            SELECT e.*, c.created_by, c.id as course_id, c.title as course_title, e.title as exercise_title
            FROM exercises e
            JOIN courses c ON e.course_id = c.id
            WHERE e.id = $1
        `, [exerciseId]);

        if (exerciseCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        const exercise = exerciseCheck.rows[0];
        if (exercise.created_by !== professorId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You do not own this course' });
        }

        const reportResult = await db.query(`
            INSERT INTO plagiarism_reports (course_id, exercise_id, initiated_by, status)
            VALUES ($1, $2, $3, 'running') RETURNING *
        `, [exercise.course_id, exerciseId, professorId]);
        const report = reportResult.rows[0];

        const submissionsResult = await db.query(`
            SELECT s.id, s.user_id, s.code, s.language, s.submitted_at, s.score,
                   u.username, u.email
            FROM submissions s
            JOIN users u ON s.user_id = u.id
            JOIN enrollments en ON en.user_id = s.user_id AND en.course_id = $1
            WHERE s.exercise_id = $2 AND s.status = 'passed'
            ORDER BY s.submitted_at DESC
        `, [exercise.course_id, exerciseId]);

        const submissions = submissionsResult.rows;

        if (submissions.length < 2) {
            await db.query(`
                UPDATE plagiarism_reports
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                    total_submissions_compared = $2, flagged_pairs = 0
                WHERE id = $1
            `, [report.id, submissions.length]);

            return res.json({
                report: { ...report, status: 'completed', flagged_pairs: 0 },
                matches: [],
                message: 'Not enough submissions to compare'
            });
        }

        if (DISTRIBUTED_MODE) {
            // Async: enqueue the heavy comparison work — professor gets WS notification when done
            await enqueuePlagiarism({
                reportId: report.id,
                submissions,
                threshold,
                professorId,
                exercise: {
                    id: exercise.id,
                    course_id: exercise.course_id,
                    course_title: exercise.course_title,
                    exercise_title: exercise.exercise_title,
                },
            });

            return res.json({ reportId: report.id, status: 'running' });
        }

        // Fallback: run inline when not in distributed mode
        const { compareAllSubmissions } = require('../utils/plagiarismDetector');
        const flaggedPairs = compareAllSubmissions(submissions, threshold);

        let maxSimilarity = 0;
        for (const pair of flaggedPairs) {
            if (pair.similarity > maxSimilarity) maxSimilarity = pair.similarity;
            await db.query(`
                INSERT INTO plagiarism_matches
                    (report_id, submission_a_id, submission_b_id, user_a_id, user_b_id,
                     similarity_score, matching_tokens, total_tokens_a, total_tokens_b, matching_fragments)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [report.id, pair.submissionA.id, pair.submissionB.id,
                pair.submissionA.user_id, pair.submissionB.user_id,
                pair.similarity, pair.matchingTokens,
                pair.totalTokensA, pair.totalTokensB, JSON.stringify(pair.fragments)]);
        }

        await db.query(`
            UPDATE plagiarism_reports
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                total_submissions_compared = $2, flagged_pairs = $3, max_similarity = $4
            WHERE id = $1
        `, [report.id, submissions.length, flaggedPairs.length, maxSimilarity]);

        const enrichedMatches = flaggedPairs.map(pair => ({
            userA: { id: pair.submissionA.user_id, username: pair.submissionA.username },
            userB: { id: pair.submissionB.user_id, username: pair.submissionB.username },
            submissionAId: pair.submissionA.id, submissionBId: pair.submissionB.id,
            similarity: pair.similarity, ngramScore: pair.ngramScore, lcsScore: pair.lcsScore,
            matchingTokens: pair.matchingTokens, totalTokensA: pair.totalTokensA, totalTokensB: pair.totalTokensB,
        }));

        res.json({
            report: { id: report.id, status: 'completed', totalSubmissions: submissions.length, flaggedPairs: flaggedPairs.length, maxSimilarity, threshold },
            matches: enrichedMatches,
        });
    } catch (error) {
        console.error('Plagiarism scan error:', error);
        res.status(500).json({ error: 'Failed to run plagiarism scan', details: error.message });
    }
};


// ─── Get plagiarism reports for a course ────────────────────────────────────
const getCourseReports = async (req, res) => {
    try {
        const { courseId } = req.params;
        const professorId = req.user.id;

        // Verify ownership
        const courseCheck = await db.query('SELECT * FROM courses WHERE id = $1 AND created_by = $2', [courseId, professorId]);
        if (courseCheck.rows.length === 0 && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const reports = await db.query(`
            SELECT pr.*, e.title as exercise_title,
                   u.username as initiated_by_username
            FROM plagiarism_reports pr
            JOIN exercises e ON pr.exercise_id = e.id
            JOIN users u ON pr.initiated_by = u.id
            WHERE pr.course_id = $1
            ORDER BY pr.created_at DESC
        `, [courseId]);

        res.json(reports.rows);
    } catch (error) {
        console.error('Get course reports error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ─── Get a single report with its matches ───────────────────────────────────
const getReportDetails = async (req, res) => {
    try {
        const { reportId } = req.params;
        const professorId = req.user.id;

        const reportResult = await db.query(`
            SELECT pr.*, e.title as exercise_title, c.title as course_title
            FROM plagiarism_reports pr
            JOIN exercises e ON pr.exercise_id = e.id
            JOIN courses c ON pr.course_id = c.id
            WHERE pr.id = $1
        `, [reportId]);

        if (reportResult.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = reportResult.rows[0];

        // Verify ownership
        const courseCheck = await db.query('SELECT * FROM courses WHERE id = $1 AND created_by = $2', [report.course_id, professorId]);
        if (courseCheck.rows.length === 0 && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const matches = await db.query(`
            SELECT pm.*,
                   ua.username as user_a_username,
                   ub.username as user_b_username,
                   sa.code as code_a, sa.submitted_at as submitted_at_a,
                   sb.code as code_b, sb.submitted_at as submitted_at_b
            FROM plagiarism_matches pm
            JOIN users ua ON pm.user_a_id = ua.id
            JOIN users ub ON pm.user_b_id = ub.id
            JOIN submissions sa ON pm.submission_a_id = sa.id
            JOIN submissions sb ON pm.submission_b_id = sb.id
            WHERE pm.report_id = $1
            ORDER BY pm.similarity_score DESC
        `, [reportId]);

        res.json({
            report: report,
            matches: matches.rows,
        });
    } catch (error) {
        console.error('Get report details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ─── Update verdict for a match ─────────────────────────────────────────────
const updateMatchVerdict = async (req, res) => {
    try {
        const { matchId } = req.params;
        const { verdict } = req.body; // "plagiarism" | "coincidence" | "pending"
        const professorId = req.user.id;

        if (!['plagiarism', 'coincidence', 'pending'].includes(verdict)) {
            return res.status(400).json({ error: 'Invalid verdict. Use: plagiarism, coincidence, or pending' });
        }

        // Verify match exists and professor owns the course
        const matchResult = await db.query(`
            SELECT pm.*, pr.course_id
            FROM plagiarism_matches pm
            JOIN plagiarism_reports pr ON pm.report_id = pr.id
            WHERE pm.id = $1
        `, [matchId]);

        if (matchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const match = matchResult.rows[0];
        const courseCheck = await db.query('SELECT * FROM courses WHERE id = $1 AND created_by = $2', [match.course_id, professorId]);
        if (courseCheck.rows.length === 0 && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db.query(`
            UPDATE plagiarism_matches 
            SET reviewed = TRUE, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, review_verdict = $3
            WHERE id = $1
        `, [matchId, professorId, verdict]);

        res.json({ message: 'Verdict updated', matchId, verdict });
    } catch (error) {
        console.error('Update verdict error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ─── Get professor plagiarism notifications ──────────────────────────────────
const getNotifications = async (req, res) => {
    try {
        const professorId = req.user.id;

        const notifications = await db.query(`
            SELECT n.*, e.title as exercise_title, c.title as course_title
            FROM notifications n
            JOIN exercises e ON n.exercise_id = e.id
            JOIN courses c ON n.course_id = c.id
            WHERE n.user_id = $1 AND n.type = 'plagiarism_alert'
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [professorId]);

        res.json(notifications.rows);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ─── Mark plagiarism notification as read ───────────────────────────────────
const markNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const professorId = req.user.id;

        await db.query(`
            UPDATE notifications SET is_read = TRUE
            WHERE id = $1 AND user_id = $2 AND type = 'plagiarism_alert'
        `, [notificationId, professorId]);

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ─── Get unread plagiarism notification count ────────────────────────────────
const getUnreadCount = async (req, res) => {
    try {
        const professorId = req.user.id;

        const result = await db.query(`
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = $1 AND type = 'plagiarism_alert' AND is_read = FALSE
        `, [professorId]);

        res.json({ unreadCount: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ─── Compare two specific submissions (ad-hoc) ─────────────────────────────
const compareTwoSubmissions = async (req, res) => {
    try {
        const { submissionAId, submissionBId } = req.body;
        const professorId = req.user.id;

        const subA = await db.query(`
            SELECT s.*, u.username FROM submissions s JOIN users u ON s.user_id = u.id WHERE s.id = $1
        `, [submissionAId]);
        const subB = await db.query(`
            SELECT s.*, u.username FROM submissions s JOIN users u ON s.user_id = u.id WHERE s.id = $1
        `, [submissionBId]);

        if (subA.rows.length === 0 || subB.rows.length === 0) {
            return res.status(404).json({ error: 'Submission(s) not found' });
        }

        const a = subA.rows[0];
        const b = subB.rows[0];

        // Verify professor owns the course
        const exerciseCheck = await db.query(`
            SELECT e.*, c.created_by FROM exercises e JOIN courses c ON e.course_id = c.id WHERE e.id = $1
        `, [a.exercise_id]);

        if (exerciseCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        if (exerciseCheck.rows[0].created_by !== professorId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = compareSubmissions(a.code, b.code, a.language || 'javascript');

        res.json({
            userA: { id: a.user_id, username: a.username },
            userB: { id: b.user_id, username: b.username },
            submissionA: { id: a.id, submittedAt: a.submitted_at },
            submissionB: { id: b.id, submittedAt: b.submitted_at },
            ...result,
        });
    } catch (error) {
        console.error('Compare submissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = {
    runPlagiarismScan,
    getCourseReports,
    getReportDetails,
    updateMatchVerdict,
    getNotifications,
    markNotificationRead,
    getUnreadCount,
    compareTwoSubmissions,
};
