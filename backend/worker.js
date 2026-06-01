/**
 * Code Execution Worker Service
 *
 * This is the standalone worker process that picks jobs from the BullMQ queue
 * and executes student code in isolation. In Docker Compose, this runs as a
 * separate container from the API.
 *
 * Usage:   DISTRIBUTED_MODE=true REDIS_URL=redis://redis:6379 node worker.js
 */

require('dotenv').config();

// Force distributed mode for the worker
process.env.DISTRIBUTED_MODE = 'true';

const http = require('http');
const { createWorker, createEmailWorker, createPlagiarismWorker } = require('./utils/queueService');
const { executeCode, executeMultiFileCode } = require('./utils/codeExecutor');
const { closeRedis } = require('./utils/redisClient');
const { sendToUser } = require('./utils/notificationService');

const WORKER_PORT = process.env.WORKER_PORT || 5002;

// ── Health check HTTP server ──────────────────────────────────────────────
// Docker/orchestrator needs a way to check if the worker is alive
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', service: 'code-runner', uptime: process.uptime() }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

healthServer.listen(WORKER_PORT, () => {
    console.log(`[Worker] Health check listening on port ${WORKER_PORT}`);
});

// ── Code execution processor ──────────────────────────────────────────────
const processJob = async (job) => {
    const { code, language, testCases, isMultiFile, files, userId } = job.data;

    console.log(`[Worker] Processing job ${job.id} — lang=${language}, tests=${testCases.length}, multi=${!!isMultiFile}`);

    let results;

    if (isMultiFile && files && files.length > 0) {
        results = await executeMultiFileCode(files, testCases, language);
    } else {
        results = await executeCode(code, testCases, language);
    }

    const testsPassed = results.filter(r => r.passed).length;

    console.log(`[Worker] Job ${job.id} done — ${testsPassed}/${testCases.length} passed`);

    // Notify the student their code is done via WebSocket (Redis Pub/Sub)
    if (userId) {
        sendToUser(userId, { type: 'execution_complete', jobId: job.id });
    }

    return { results, testsPassed, testsTotal: testCases.length };
};

// ── Email processor ───────────────────────────────────────────────────────
const processEmailJob = async (job) => {
    const { sendEmail } = require('./utils/emailService');
    await sendEmail(job.data);
    console.log(`[EmailWorker] Sent ${job.data.type} email`);
};

// ── Plagiarism processor ──────────────────────────────────────────────────
const processPlagiarismJob = async (job) => {
    const db = require('./config/database');
    const { compareAllSubmissions } = require('./utils/plagiarismDetector');
    const emailService = require('./utils/emailService');
    const { reportId, submissions, threshold, professorId, exercise } = job.data;

    console.log(`[PlagiarismWorker] Scanning report ${reportId} — ${submissions.length} submissions`);

    const flaggedPairs = compareAllSubmissions(submissions, threshold);

    let maxSimilarity = 0;
    for (const pair of flaggedPairs) {
        if (pair.similarity > maxSimilarity) maxSimilarity = pair.similarity;
        await db.query(`
            INSERT INTO plagiarism_matches
                (report_id, submission_a_id, submission_b_id, user_a_id, user_b_id,
                 similarity_score, matching_tokens, total_tokens_a, total_tokens_b, matching_fragments)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            reportId,
            pair.submissionA.id, pair.submissionB.id,
            pair.submissionA.user_id, pair.submissionB.user_id,
            pair.similarity, pair.matchingTokens,
            pair.totalTokensA, pair.totalTokensB,
            JSON.stringify(pair.fragments),
        ]);
    }

    await db.query(`
        UPDATE plagiarism_reports
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
            total_submissions_compared = $2, flagged_pairs = $3, max_similarity = $4
        WHERE id = $1
    `, [reportId, submissions.length, flaggedPairs.length, maxSimilarity]);

    if (flaggedPairs.length > 0) {
        const message = `Plagiarism alert: ${flaggedPairs.length} suspicious pair(s) detected for exercise "${exercise.exercise_title}" in course "${exercise.course_title}". Maximum similarity: ${maxSimilarity.toFixed(1)}%.`;

        await db.query(`
            INSERT INTO notifications (user_id, type, title, message, course_id, exercise_id, report_id)
            VALUES ($1, 'plagiarism_alert', 'Plagiarism Alert', $2, $3, $4, $5)
        `, [professorId, message, exercise.course_id, exercise.id, reportId]);

        sendToUser(professorId, { type: 'plagiarism_complete', reportId, flaggedPairs: flaggedPairs.length, maxSimilarity });

        try {
            const profResult = await db.query('SELECT email, username FROM users WHERE id = $1', [professorId]);
            if (profResult.rows.length > 0) {
                const prof = profResult.rows[0];
                await emailService.sendPlagiarismAlertEmail(
                    prof.email, prof.username, exercise.course_title,
                    exercise.exercise_title, flaggedPairs.length, maxSimilarity, reportId
                );
            }
        } catch (emailErr) {
            console.error('[PlagiarismWorker] Failed to send email:', emailErr.message);
        }
    } else {
        sendToUser(professorId, { type: 'plagiarism_complete', reportId, flaggedPairs: 0, maxSimilarity: 0 });
    }

    console.log(`[PlagiarismWorker] Report ${reportId} done — ${flaggedPairs.length} flagged pairs`);
};

// ── Start the BullMQ workers ──────────────────────────────────────────────
const worker = createWorker(processJob, parseInt(process.env.WORKER_CONCURRENCY || '3', 10));
const emailWorker = createEmailWorker(processEmailJob);
const plagiarismWorker = createPlagiarismWorker(processPlagiarismJob);

// ── Graceful shutdown ─────────────────────────────────────────────────────
const shutdown = async (signal) => {
    console.log(`[Worker] Received ${signal}, shutting down...`);
    await worker.close();
    await emailWorker.close();
    await plagiarismWorker.close();
    await closeRedis();
    healthServer.close();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('[Worker] Code execution worker started');
