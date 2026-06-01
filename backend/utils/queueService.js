const { Queue, Worker, QueueEvents } = require('bullmq');
const { getRedisClient, DISTRIBUTED_MODE } = require('./redisClient');

const QUEUE_NAME = 'code-execution';
const EMAIL_QUEUE_NAME = 'email';
const PLAGIARISM_QUEUE_NAME = 'plagiarism';

let executionQueue = null;
let emailQueue = null;
let plagiarismQueue = null;
let queueEvents = null;

/**
 * Get or create the BullMQ queue for code execution jobs.
 */
const getQueue = () => {
    if (!DISTRIBUTED_MODE) return null;

    if (!executionQueue) {
        executionQueue = new Queue(QUEUE_NAME, {
            connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), maxRetriesPerRequest: null },
            defaultJobOptions: {
                removeOnComplete: { age: 3600 },   // keep completed jobs for 1 hour
                removeOnFail: { age: 86400 },       // keep failed jobs for 24 hours
                attempts: 2,
                backoff: { type: 'exponential', delay: 1000 },
            },
        });

        executionQueue.on('error', (err) => console.error('[Queue] Error:', err.message));
        console.log('[Queue] Code execution queue ready');
    }

    return executionQueue;
};

/**
 * Get QueueEvents (used for waiting on job results from the API side).
 */
const getQueueEvents = () => {
    if (!DISTRIBUTED_MODE) return null;

    if (!queueEvents) {
        queueEvents = new QueueEvents(QUEUE_NAME, {
            connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), maxRetriesPerRequest: null },
        });
    }

    return queueEvents;
};

/**
 * Enqueue a code execution job. Returns the job object.
 *
 * @param {Object} payload
 * @param {string} payload.code       – student code (or JSON stringified files for multi-file)
 * @param {string} payload.language    – programming language
 * @param {Array}  payload.testCases   – array of test case objects
 * @param {boolean} payload.isMultiFile
 * @param {Array}  payload.files       – multi-file array (optional)
 * @param {number} payload.exerciseId
 * @param {number} payload.userId
 * @returns {Promise<import('bullmq').Job>}
 */
const enqueueExecution = async (payload) => {
    const queue = getQueue();
    if (!queue) {
        throw new Error('Queue not available — not in distributed mode');
    }

    const job = await queue.add('execute', payload, {
        // Priority: normal submissions
        priority: 1,
    });

    return job;
};

/**
 * Get the status and queue position of a job.
 */
const getJobStatus = async (jobId) => {
    const queue = getQueue();
    if (!queue) throw new Error('Queue not available');

    const job = await queue.getJob(jobId);
    if (!job) return { status: 'not_found' };

    const state = await job.getState();

    if (state === 'waiting' || state === 'delayed') {
        const waitingJobs = await queue.getWaiting();
        const position = waitingJobs.findIndex(j => j.id === jobId) + 1;
        const total = waitingJobs.length;
        return { status: 'waiting', position: position || total, total };
    }

    if (state === 'active') return { status: 'active' };
    if (state === 'completed') return { status: 'completed', result: job.returnvalue };
    if (state === 'failed') return { status: 'failed', reason: job.failedReason };

    return { status: state };
};

/**
 * Wait for a job to finish and return its result.
 * Times out after `timeoutMs` milliseconds.
 */
const waitForResult = async (jobId, timeoutMs = 30000) => {
    const events = getQueueEvents();
    const queue = getQueue();

    if (!events || !queue) {
        throw new Error('Queue not available');
    }

    // Wait for the job to be completed or failed
    const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Code execution timed out'));
        }, timeoutMs);

        const checkResult = async () => {
            const job = await queue.getJob(jobId);
            if (!job) {
                clearTimeout(timeout);
                return reject(new Error('Job not found'));
            }
            const state = await job.getState();
            if (state === 'completed') {
                clearTimeout(timeout);
                return resolve(job.returnvalue);
            }
            if (state === 'failed') {
                clearTimeout(timeout);
                return reject(new Error(job.failedReason || 'Execution failed'));
            }
        };

        // Poll every 500ms (BullMQ events can be unreliable across connections)
        const interval = setInterval(async () => {
            try {
                await checkResult();
                clearInterval(interval);
            } catch (err) {
                if (err.message !== 'Job still running') {
                    clearInterval(interval);
                    reject(err);
                }
            }
        }, 500);

        // Also try immediately
        checkResult().catch(() => {});
    });

    return result;
};

/**
 * Create a BullMQ worker that processes code execution jobs.
 * This is called from worker.js — the separate worker service.
 *
 * @param {Function} processFn – async function(job) that returns results
 */
const createWorker = (processFn, concurrency = 3) => {
    const worker = new Worker(QUEUE_NAME, processFn, {
        connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), maxRetriesPerRequest: null },
        concurrency,
        limiter: {
            max: 10,
            duration: 1000,
        },
    });

    worker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
        console.error('[Worker] Error:', err.message);
    });

    console.log(`[Worker] Processing "${QUEUE_NAME}" with concurrency=${concurrency}`);
    return worker;
};

// ── Email queue ───────────────────────────────────────────────────────────────

const getEmailQueue = () => {
    if (!DISTRIBUTED_MODE) return null;
    if (!emailQueue) {
        emailQueue = new Queue(EMAIL_QUEUE_NAME, {
            connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), maxRetriesPerRequest: null },
            defaultJobOptions: {
                removeOnComplete: { age: 3600 },
                removeOnFail: { age: 86400 },
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
            },
        });
        emailQueue.on('error', (err) => console.error('[EmailQueue] Error:', err.message));
    }
    return emailQueue;
};

const enqueueEmail = async (payload) => {
    const queue = getEmailQueue();
    if (!queue) {
        // Fallback: send inline when not in distributed mode
        const emailService = require('./emailService');
        return emailService.sendEmail(payload);
    }
    return queue.add('send', payload);
};

const createEmailWorker = (processFn) => {
    const worker = new Worker(EMAIL_QUEUE_NAME, processFn, {
        connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), maxRetriesPerRequest: null },
        concurrency: 5,
    });
    worker.on('completed', (job) => console.log(`[EmailWorker] Job ${job.id} sent`));
    worker.on('failed', (job, err) => console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message));
    worker.on('error', (err) => console.error('[EmailWorker] Error:', err.message));
    return worker;
};

// ── Plagiarism queue ──────────────────────────────────────────────────────────

const getPlagiarismQueue = () => {
    if (!DISTRIBUTED_MODE) return null;
    if (!plagiarismQueue) {
        plagiarismQueue = new Queue(PLAGIARISM_QUEUE_NAME, {
            connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), maxRetriesPerRequest: null },
            defaultJobOptions: {
                removeOnComplete: { age: 3600 },
                removeOnFail: { age: 86400 },
                attempts: 2,
                backoff: { type: 'exponential', delay: 2000 },
            },
        });
        plagiarismQueue.on('error', (err) => console.error('[PlagiarismQueue] Error:', err.message));
    }
    return plagiarismQueue;
};

const enqueuePlagiarism = async (payload) => {
    const queue = getPlagiarismQueue();
    if (!queue) throw new Error('Queue not available — not in distributed mode');
    return queue.add('scan', payload);
};

const createPlagiarismWorker = (processFn) => {
    const worker = new Worker(PLAGIARISM_QUEUE_NAME, processFn, {
        connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), maxRetriesPerRequest: null },
        concurrency: 2,
    });
    worker.on('completed', (job) => console.log(`[PlagiarismWorker] Job ${job.id} done`));
    worker.on('failed', (job, err) => console.error(`[PlagiarismWorker] Job ${job?.id} failed:`, err.message));
    worker.on('error', (err) => console.error('[PlagiarismWorker] Error:', err.message));
    return worker;
};

/**
 * Graceful shutdown
 */
const closeQueue = async () => {
    if (executionQueue) await executionQueue.close();
    if (emailQueue) await emailQueue.close();
    if (plagiarismQueue) await plagiarismQueue.close();
    if (queueEvents) await queueEvents.close();
};

module.exports = {
    getQueue,
    getQueueEvents,
    enqueueExecution,
    getJobStatus,
    waitForResult,
    createWorker,
    enqueueEmail,
    createEmailWorker,
    enqueuePlagiarism,
    createPlagiarismWorker,
    closeQueue,
};
