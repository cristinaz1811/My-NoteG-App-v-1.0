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
const { createWorker } = require('./utils/queueService');
const { executeCode, executeMultiFileCode } = require('./utils/codeExecutor');
const { closeRedis } = require('./utils/redisClient');

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

// ── Job processor ─────────────────────────────────────────────────────────
const processJob = async (job) => {
    const { code, language, testCases, isMultiFile, files } = job.data;

    console.log(`[Worker] Processing job ${job.id} — lang=${language}, tests=${testCases.length}, multi=${!!isMultiFile}`);

    let results;

    if (isMultiFile && files && files.length > 0) {
        results = await executeMultiFileCode(files, testCases, language);
    } else {
        results = await executeCode(code, testCases, language);
    }

    const testsPassed = results.filter(r => r.passed).length;

    console.log(`[Worker] Job ${job.id} done — ${testsPassed}/${testCases.length} passed`);

    return { results, testsPassed, testsTotal: testCases.length };
};

// ── Start the BullMQ worker ───────────────────────────────────────────────
const worker = createWorker(processJob, parseInt(process.env.WORKER_CONCURRENCY || '3', 10));

// ── Graceful shutdown ─────────────────────────────────────────────────────
const shutdown = async (signal) => {
    console.log(`[Worker] Received ${signal}, shutting down...`);
    await worker.close();
    await closeRedis();
    healthServer.close();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('[Worker] Code execution worker started');
