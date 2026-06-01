const db = require('../config/database');
const { generateHints, generateOptimizationHints, analyzeComplexity } = require('../utils/openaiService');
const { notifyNewExercise, notifyCourseCompleted, createNotification } = require('../utils/notificationService');
const { DISTRIBUTED_MODE, cacheGet, cacheSet } = require('../utils/redisClient');

const getExerciseById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try cache first (exercise data without user-specific fields)
        const cacheKey = `exercise:${id}`;
        const cached = await cacheGet(cacheKey);

        let exercise, testCasesRows, exerciseFiles;

        if (cached) {
            exercise = cached.exercise;
            testCasesRows = cached.testCases;
            exerciseFiles = cached.exerciseFiles;
        } else {
            const exerciseResult = await db.query(
                'SELECT * FROM exercises WHERE id = $1',
                [id]
            );

            if (exerciseResult.rows.length === 0) {
                return res.status(404).json({ error: 'Exercise not found' });
            }

            exercise = exerciseResult.rows[0];

            const testCasesResult = await db.query(
                'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE exercise_id = $1',
                [id]
            );
            testCasesRows = testCasesResult.rows;

            // Get exercise files if multi-file exercise
            exerciseFiles = [];
            if (exercise.is_multi_file) {
                const filesResult = await db.query(
                    'SELECT id, filename, starter_code, is_entry_point, display_order FROM exercise_files WHERE exercise_id = $1 ORDER BY display_order, id',
                    [id]
                );
                exerciseFiles = filesResult.rows;
            }

            // Cache for 5 minutes
            await cacheSet(cacheKey, { exercise, testCases: testCasesRows, exerciseFiles }, 300);
        }

        // Check if this is the first exercise of its course (for demo access)
        let isFirstExercise = false;
        let isFirstChapter = false;
        let courseId = exercise.course_id;

        if (courseId) {
            // Find the first chapter of the course
            const firstChapterResult = await db.query(
                'SELECT id FROM chapters WHERE course_id = $1 ORDER BY order_index NULLS LAST, id LIMIT 1',
                [courseId]
            );

            let firstChapterId = null;
            if (firstChapterResult.rows.length > 0) {
                firstChapterId = firstChapterResult.rows[0].id;
                isFirstChapter = exercise.chapter_id === firstChapterId;
            }

            // Find the first exercise in the course (general case - no chapter)
            const firstExerciseResult = await db.query(
                `SELECT id FROM exercises 
                 WHERE course_id = $1 
                 ORDER BY COALESCE(chapter_id, 0), order_index NULLS LAST, id 
                 LIMIT 1`,
                [courseId]
            );

            if (firstExerciseResult.rows.length > 0) {
                isFirstExercise = exercise.id === firstExerciseResult.rows[0].id;
            }
        }

        // Check enrollment and whether this is a demo exercise
        let isEnrolled = false;
        let userProgress = null;
        let timedSession = null;

        if (req.user) {
            const enrollmentResult = await db.query(
                'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
                [req.user.id, courseId]
            );
            isEnrolled = enrollmentResult.rows.length > 0;

            // Only get user progress if enrolled or if this is a demo exercise
            if (isEnrolled || isFirstExercise) {
                const progressResult = await db.query(
                    'SELECT * FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
                    [req.user.id, id]
                );
                userProgress = progressResult.rows[0] || null;

                // Get timed session if exercise has a time limit
                if (exercise.time_limit_minutes) {
                    const sessionResult = await db.query(
                        'SELECT * FROM exam_sessions WHERE user_id = $1 AND exercise_id = $2',
                        [req.user.id, id]
                    );
                    timedSession = sessionResult.rows[0] || null;
                }
            }
        }

        res.json({
            ...exercise,
            testCases: testCasesRows.filter(tc => !tc.is_hidden),
            totalTestCases: testCasesRows.length,
            userProgress,
            timedSession,
            exerciseFiles,
            isFirstExercise,
            isFirstChapter,
            isEnrolled,
        });
    } catch (error) {
        console.error('Get exercise error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createExercise = async (req, res) => {
    try {
        const { courseId, title, description, difficulty, starterCode, language, testCases, chapter_id, requires_efficiency, time_limit_minutes, is_multi_file, files } = req.body;

        // Create exercise
        const exerciseResult = await db.query(
            `INSERT INTO exercises (course_id, title, description, difficulty, starter_code, language, chapter_id, requires_efficiency, time_limit_minutes, is_multi_file) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [courseId, title, description, difficulty, is_multi_file ? null : starterCode, language, chapter_id || null, requires_efficiency || false, time_limit_minutes || null, is_multi_file || false]
        );

        const exercise = exerciseResult.rows[0];

        // Create exercise files if multi-file
        if (is_multi_file && files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await db.query(
                    'INSERT INTO exercise_files (exercise_id, filename, starter_code, is_entry_point, display_order) VALUES ($1, $2, $3, $4, $5)',
                    [exercise.id, file.filename, file.starter_code || '', file.is_entry_point || false, file.display_order ?? i]
                );
            }
        }

        // Create test cases if provided
        if (testCases && testCases.length > 0) {
            for (const tc of testCases) {
                await db.query(
                    'INSERT INTO test_cases (exercise_id, input, expected_output, is_hidden, weight) VALUES ($1, $2, $3, $4, $5)',
                    [exercise.id, tc.input, tc.expectedOutput, tc.isHidden || false, tc.weight || 1]
                );
            }
        }

        // Notify enrolled students about the new exercise
        notifyNewExercise({
            courseId: exercise.course_id,
            exerciseTitle: exercise.title,
            exerciseId: exercise.id,
            professorId: req.user.id,
        });

        res.status(201).json(exercise);
    } catch (error) {
        console.error('Create exercise error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const submitSolution = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, language, files } = req.body;
        const userId = req.user.id;

        // Get exercise and test cases
        const exerciseResult = await db.query('SELECT * FROM exercises WHERE id = $1', [id]);
        if (exerciseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        const exercise = exerciseResult.rows[0];

        // Check if this is the first exercise of the course (for demo access)
        let isFirstExercise = false;
        if (exercise.course_id) {
            const firstExerciseResult = await db.query(
                `SELECT id FROM exercises 
                 WHERE course_id = $1 
                 ORDER BY COALESCE(chapter_id, 0), order_index NULLS LAST, id 
                 LIMIT 1`,
                [exercise.course_id]
            );
            isFirstExercise = firstExerciseResult.rows.length > 0 && exercise.id === firstExerciseResult.rows[0].id;
        }

        // Check enrollment: only required if not the first exercise
        if (!isFirstExercise) {
            const enrollmentResult = await db.query(
                'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
                [userId, exercise.course_id]
            );
            if (enrollmentResult.rows.length === 0) {
                return res.status(403).json({ error: 'You must be enrolled in this course to submit. Complete the demo exercise and enroll to continue.' });
            }
        }

        // Check if this is a timed exercise and if the timer has expired
        if (exercise.time_limit_minutes) {
            const sessionResult = await db.query(
                'SELECT * FROM exam_sessions WHERE user_id = $1 AND exercise_id = $2',
                [userId, id]
            );
            const session = sessionResult.rows[0];
            if (!session) {
                return res.status(400).json({ error: 'You must start the timer before submitting. Please refresh the page.' });
            }
            if (session.locked_by_flag) {
                return res.status(403).json({ error: 'Your session has been locked due to focus violations. Contact your professor to unlock it.', locked: true });
            }
            if (new Date() > new Date(session.expires_at)) {
                // Mark session as expired
                await db.query(
                    'UPDATE exam_sessions SET time_expired = TRUE WHERE id = $1',
                    [session.id]
                );
                return res.status(403).json({ error: 'Time has expired for this exercise. You can no longer submit solutions.', timeExpired: true });
            }
        }

        const testCasesResult = await db.query(
            'SELECT * FROM test_cases WHERE exercise_id = $1',
            [id]
        );

        const testCases = testCasesResult.rows;

        // Execute code against test cases
        let results;

        if (DISTRIBUTED_MODE) {
            // Async: enqueue and return job ID immediately — client polls /jobs/:jobId/result
            const { enqueueExecution } = require('../utils/queueService');

            const job = await enqueueExecution({
                code,
                language,
                testCases,
                isMultiFile: exercise.is_multi_file,
                files: exercise.is_multi_file ? files : undefined,
                exerciseId: parseInt(id),
                userId,
            });

            // Store submission context so getJobResult can finalize it
            await cacheSet(`job:ctx:${job.id}`, {
                exerciseId: parseInt(id),
                userId,
                code: exercise.is_multi_file && files ? JSON.stringify(files) : code,
                language,
                isFirstExercise,
                requiresEfficiency: exercise.requires_efficiency,
                courseId: exercise.course_id,
            }, 3600);

            return res.json({ jobId: job.id, status: 'queued' });
        } else {
            // Local mode: execute directly in-process
            const { executeCode, executeMultiFileCode } = require('../utils/codeExecutor');

            if (exercise.is_multi_file && files && files.length > 0) {
                results = await executeMultiFileCode(files, testCases, language);
            } else {
                results = await executeCode(code, testCases, language);
            }
        }

        const testsPassed = results.filter(r => r.passed).length;
        const testsTotal = testCases.length;
        const allPassed = testsPassed === testsTotal;

        // Score logic:
        // - If requires_efficiency: all tests pass = 80%, optimal complexity = 100%
        // - If not requires_efficiency: all tests pass = 100%
        let score;
        if (allPassed && exercise.requires_efficiency) {
            score = 80; // Will be upgraded to 100 when complexity analysis confirms optimal
        } else {
            score = (testsPassed / testsTotal) * 100;
        }
        const status = allPassed ? 'passed' : 'failed';

        // For multi-file exercises, store all files as JSON in code column
        const codeToStore = exercise.is_multi_file && files ? JSON.stringify(files) : code;

        // Save submission
        const submissionResult = await db.query(
            `INSERT INTO submissions (user_id, exercise_id, code, language, status, score, tests_passed, tests_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [userId, id, codeToStore, language, status, score, testsPassed, testsTotal]
        );

        // Update user progress
        const progressCheck = await db.query(
            'SELECT * FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
            [userId, id]
        );

        if (progressCheck.rows.length === 0) {
            const completionStatus = allPassed
                ? (exercise.requires_efficiency ? 'inefficient' : 'completed')
                : 'in_progress';
            await db.query(
                `INSERT INTO user_progress (user_id, exercise_id, completed, best_score, attempts, last_attempt_at, completion_status)
                 VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, $5)`,
                [userId, id, allPassed, score, completionStatus]
            );
        } else {
            const currentBestScore = progressCheck.rows[0].best_score;
            const newBestScore = Math.max(currentBestScore, score);
            const currentStatus = progressCheck.rows[0].completion_status;
            let newStatus = currentStatus;
            if (allPassed && currentStatus === 'in_progress') {
                newStatus = exercise.requires_efficiency ? 'inefficient' : 'completed';
            }
            await db.query(
                `UPDATE user_progress 
                 SET completed = $3, best_score = $4, attempts = attempts + 1, last_attempt_at = CURRENT_TIMESTAMP, completion_status = $5
                 WHERE user_id = $1 AND exercise_id = $2`,
                [userId, id, allPassed || progressCheck.rows[0].completed, newBestScore, newStatus]
            );
        }

        // Check if student just completed the course (all exercises passed)
        if (allPassed) {
            notifyCourseCompleted({ studentId: userId, courseId: exercise.course_id });
        }

        res.json({
            submission: submissionResult.rows[0],
            results,
            score,
            testsPassed,
            testsTotal,
            isFirstExercise,
        });
    } catch (error) {
        console.error('Submit solution error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const getJobResult = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;

        // Return cached result if already processed
        const cached = await cacheGet(`job:result:${jobId}`);
        if (cached) return res.json(cached);

        const { getJobStatus } = require('../utils/queueService');
        const jobStatus = await getJobStatus(jobId);

        if (jobStatus.status === 'not_found') {
            return res.status(404).json({ error: 'Job not found' });
        }
        if (jobStatus.status === 'waiting') {
            return res.json({ status: 'queued', position: jobStatus.position, total: jobStatus.total });
        }
        if (jobStatus.status === 'active') {
            return res.json({ status: 'running' });
        }
        if (jobStatus.status === 'failed') {
            return res.status(500).json({ error: 'Execution failed', details: jobStatus.reason });
        }
        if (jobStatus.status !== 'completed') {
            return res.json({ status: jobStatus.status });
        }

        // Job completed — process and save (idempotent: Redis lock prevents double-save)
        const lockKey = `job:processing:${jobId}`;
        const client = require('../utils/redisClient').getRedisClient();
        if (client) {
            const locked = await client.set(lockKey, '1', 'NX', 'EX', 60);
            if (!locked) {
                // Another request is processing — return running status briefly
                return res.json({ status: 'running' });
            }
        }

        try {
            const ctx = await cacheGet(`job:ctx:${jobId}`);
            if (!ctx) return res.status(404).json({ error: 'Job context expired' });

            // Verify this job belongs to the requesting user
            if (ctx.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

            const execResult = jobStatus.result;
            const { results, testsPassed, testsTotal } = execResult;
            const allPassed = testsPassed === testsTotal;

            let score;
            if (allPassed && ctx.requiresEfficiency) {
                score = 80;
            } else {
                score = (testsPassed / testsTotal) * 100;
            }
            const status = allPassed ? 'passed' : 'failed';

            const submissionResult = await db.query(
                `INSERT INTO submissions (user_id, exercise_id, code, language, status, score, tests_passed, tests_total)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [userId, ctx.exerciseId, ctx.code, ctx.language, status, score, testsPassed, testsTotal]
            );

            const progressCheck = await db.query(
                'SELECT * FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
                [userId, ctx.exerciseId]
            );

            if (progressCheck.rows.length === 0) {
                const completionStatus = allPassed
                    ? (ctx.requiresEfficiency ? 'inefficient' : 'completed')
                    : 'in_progress';
                await db.query(
                    `INSERT INTO user_progress (user_id, exercise_id, completed, best_score, attempts, last_attempt_at, completion_status)
                     VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, $5)`,
                    [userId, ctx.exerciseId, allPassed, score, completionStatus]
                );
            } else {
                const newBestScore = Math.max(progressCheck.rows[0].best_score, score);
                const currentStatus = progressCheck.rows[0].completion_status;
                let newStatus = currentStatus;
                if (allPassed && currentStatus === 'in_progress') {
                    newStatus = ctx.requiresEfficiency ? 'inefficient' : 'completed';
                }
                await db.query(
                    `UPDATE user_progress
                     SET completed = $3, best_score = $4, attempts = attempts + 1, last_attempt_at = CURRENT_TIMESTAMP, completion_status = $5
                     WHERE user_id = $1 AND exercise_id = $2`,
                    [userId, ctx.exerciseId, allPassed || progressCheck.rows[0].completed, newBestScore, newStatus]
                );
            }

            if (allPassed) {
                notifyCourseCompleted({ studentId: userId, courseId: ctx.courseId });
            }

            const response = {
                status: 'completed',
                submission: submissionResult.rows[0],
                results,
                score,
                testsPassed,
                testsTotal,
                isFirstExercise: ctx.isFirstExercise,
            };

            await cacheSet(`job:result:${jobId}`, response, 3600);
            return res.json(response);
        } finally {
            if (client) await client.del(lockKey);
        }
    } catch (error) {
        console.error('Get job result error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const getUserSubmissions = async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const userId = req.user.id;
        const includeCode = req.query.includeCode === 'true';

        const fields = includeCode
            ? 'id, code, language, status, score, tests_passed, tests_total, execution_time, submitted_at'
            : 'id, status, score, tests_passed, tests_total, execution_time, submitted_at';

        const result = await db.query(
            `SELECT ${fields}
             FROM submissions 
             WHERE user_id = $1 AND exercise_id = $2
             ORDER BY submitted_at DESC
             LIMIT 50`,
            [userId, exerciseId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get a single submission detail (with code)
const getSubmissionDetail = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            `SELECT id, code, language, status, score, tests_passed, tests_total, execution_time, error_message, submitted_at
             FROM submissions 
             WHERE id = $1 AND user_id = $2`,
            [submissionId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get submission detail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Update exercise
const updateExercise = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, difficulty, starter_code, language, chapter_id, order_index, requires_efficiency, time_limit_minutes, is_multi_file } = req.body;
        const userId = req.user.id;

        // Verify ownership through course
        const exercise = await db.query(`
            SELECT e.*, c.created_by 
            FROM exercises e 
            JOIN courses c ON e.course_id = c.id 
            WHERE e.id = $1
        `, [id]);

        if (exercise.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        if (exercise.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // For time_limit_minutes, allow explicit null to remove the limit
        const timeLimitValue = time_limit_minutes === null ? null : (time_limit_minutes !== undefined ? time_limit_minutes : exercise.rows[0].time_limit_minutes);

        const result = await db.query(`
            UPDATE exercises 
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                difficulty = COALESCE($3, difficulty),
                starter_code = COALESCE($4, starter_code),
                language = COALESCE($5, language),
                chapter_id = COALESCE($6, chapter_id),
                order_index = COALESCE($7, order_index),
                requires_efficiency = COALESCE($8, requires_efficiency),
                time_limit_minutes = $9,
                is_multi_file = COALESCE($11, is_multi_file),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `, [title, description, difficulty, starter_code, language, chapter_id, order_index, requires_efficiency, timeLimitValue, id, is_multi_file]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update exercise error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Delete exercise
const deleteExercise = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify ownership through course
        const exercise = await db.query(`
            SELECT e.*, c.created_by 
            FROM exercises e 
            JOIN courses c ON e.course_id = c.id 
            WHERE e.id = $1
        `, [id]);

        if (exercise.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        if (exercise.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.query('DELETE FROM exercises WHERE id = $1', [id]);
        res.json({ message: 'Exercise deleted successfully' });
    } catch (error) {
        console.error('Delete exercise error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Add test case
const addTestCase = async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const { input, expected_output, is_hidden, weight } = req.body;
        const userId = req.user.id;

        // Verify ownership through course
        const exercise = await db.query(`
            SELECT e.*, c.created_by 
            FROM exercises e 
            JOIN courses c ON e.course_id = c.id 
            WHERE e.id = $1
        `, [exerciseId]);

        if (exercise.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        if (exercise.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await db.query(
            'INSERT INTO test_cases (exercise_id, input, expected_output, is_hidden, weight) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [exerciseId, input, expected_output, is_hidden || false, weight || 1]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add test case error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Update test case
const updateTestCase = async (req, res) => {
    try {
        const { testCaseId } = req.params;
        const { input, expected_output, is_hidden, weight } = req.body;
        const userId = req.user.id;

        // Verify ownership through exercise and course
        const testCase = await db.query(`
            SELECT tc.*, c.created_by 
            FROM test_cases tc 
            JOIN exercises e ON tc.exercise_id = e.id
            JOIN courses c ON e.course_id = c.id 
            WHERE tc.id = $1
        `, [testCaseId]);

        if (testCase.rows.length === 0) {
            return res.status(404).json({ error: 'Test case not found' });
        }
        if (testCase.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await db.query(`
            UPDATE test_cases 
            SET input = COALESCE($1, input),
                expected_output = COALESCE($2, expected_output),
                is_hidden = COALESCE($3, is_hidden),
                weight = COALESCE($4, weight)
            WHERE id = $5
            RETURNING *
        `, [input, expected_output, is_hidden, weight, testCaseId]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update test case error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Delete test case
const deleteTestCase = async (req, res) => {
    try {
        const { testCaseId } = req.params;
        const userId = req.user.id;

        // Verify ownership through exercise and course
        const testCase = await db.query(`
            SELECT tc.*, c.created_by 
            FROM test_cases tc 
            JOIN exercises e ON tc.exercise_id = e.id
            JOIN courses c ON e.course_id = c.id 
            WHERE tc.id = $1
        `, [testCaseId]);

        if (testCase.rows.length === 0) {
            return res.status(404).json({ error: 'Test case not found' });
        }
        if (testCase.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.query('DELETE FROM test_cases WHERE id = $1', [testCaseId]);
        res.json({ message: 'Test case deleted successfully' });
    } catch (error) {
        console.error('Delete test case error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Get all test cases for an exercise (including hidden)
const getExerciseTestCases = async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const userId = req.user.id;

        // Verify ownership through course
        const exercise = await db.query(`
            SELECT e.*, c.created_by 
            FROM exercises e 
            JOIN courses c ON e.course_id = c.id 
            WHERE e.id = $1
        `, [exerciseId]);

        if (exercise.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        if (exercise.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await db.query(
            'SELECT * FROM test_cases WHERE exercise_id = $1 ORDER BY id',
            [exerciseId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get test cases error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// AI Hints - get hints for an exercise (unlocks progressively)
const getAIHints = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const mode = req.query.mode || 'solving'; // 'solving' or 'optimizing'

        // Get exercise details
        const exerciseResult = await db.query('SELECT * FROM exercises WHERE id = $1', [id]);
        if (exerciseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        // Get user's attempts count
        const progressResult = await db.query(
            'SELECT attempts, best_score FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
            [userId, id]
        );
        const attempts = progressResult.rows[0]?.attempts || 0;
        const bestScore = progressResult.rows[0]?.best_score || 0;

        let hintsUnlocked, failedAttempts;

        if (mode === 'optimizing') {
            // For optimization mode: count attempts AFTER first solve
            // Get the number of submissions after the first passing one
            const optimizationAttemptsResult = await db.query(
                `SELECT COUNT(*) as count FROM submissions 
                 WHERE user_id = $1 AND exercise_id = $2 
                 AND submitted_at > (
                     SELECT MIN(submitted_at) FROM submissions 
                     WHERE user_id = $1 AND exercise_id = $2 AND status = 'passed'
                 )`,
                [userId, id]
            );
            failedAttempts = parseInt(optimizationAttemptsResult.rows[0]?.count || 0);
            hintsUnlocked = Math.min(3, Math.floor(failedAttempts / 2));
        } else {
            // For solving mode: count failed attempts before passing
            failedAttempts = bestScore >= 100 ? 0 : attempts;
            hintsUnlocked = Math.min(3, Math.floor(failedAttempts / 2));
        }

        // Get already generated hints from DB for this mode
        const existingHints = await db.query(
            'SELECT hint_number, hint_text, unlocked_at FROM ai_hints WHERE user_id = $1 AND exercise_id = $2 AND hint_mode = $3 ORDER BY hint_number',
            [userId, id, mode]
        );

        const hints = [];
        for (let i = 1; i <= 3; i++) {
            const existing = existingHints.rows.find(h => h.hint_number === i);
            if (i <= hintsUnlocked) {
                if (existing) {
                    hints.push({ number: i, text: existing.hint_text, unlocked: true });
                } else {
                    hints.push({ number: i, text: null, unlocked: true, needsGeneration: true });
                }
            } else {
                hints.push({ number: i, text: null, unlocked: false });
            }
        }

        res.json({
            hints,
            hintsUnlocked,
            failedAttempts,
            mode,
            attemptsUntilNextHint: hintsUnlocked >= 3 ? 0 : ((hintsUnlocked + 1) * 2) - failedAttempts,
        });
    } catch (error) {
        console.error('Get AI hints error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// AI Hints - generate a specific hint
const generateAIHint = async (req, res) => {
    try {
        const { id } = req.params;
        const { hintNumber, code, failedTests, mode, currentComplexity, optimalComplexity } = req.body;
        const userId = req.user.id;
        const hintMode = mode || 'solving';

        if (!hintNumber || hintNumber < 1 || hintNumber > 3) {
            return res.status(400).json({ error: 'Invalid hint number' });
        }

        // Check if hint already exists for this mode
        const existingHint = await db.query(
            'SELECT hint_text FROM ai_hints WHERE user_id = $1 AND exercise_id = $2 AND hint_number = $3 AND hint_mode = $4',
            [userId, id, hintNumber, hintMode]
        );

        if (existingHint.rows.length > 0) {
            return res.json({ hint: existingHint.rows[0].hint_text });
        }

        // Get exercise details
        const exerciseResult = await db.query('SELECT * FROM exercises WHERE id = $1', [id]);
        const exercise = exerciseResult.rows[0];

        let hintText;

        if (hintMode === 'optimizing') {
            // Generate optimization hint
            hintText = await generateOptimizationHints({
                exerciseTitle: exercise.title,
                exerciseDescription: exercise.description,
                language: exercise.language,
                code: code || '',
                currentComplexity: currentComplexity || 'unknown',
                optimalComplexity: optimalComplexity || 'unknown',
                hintNumber,
            });
        } else {
            // Generate solving hint
            const testCasesResult = await db.query(
                'SELECT input, expected_output FROM test_cases WHERE exercise_id = $1 LIMIT 3',
                [id]
            );

            hintText = await generateHints({
                exerciseTitle: exercise.title,
                exerciseDescription: exercise.description,
                language: exercise.language,
                code: code || '',
                testCases: testCasesResult.rows,
                failedTests: failedTests || [],
                hintNumber,
            });
        }

        // Save hint to DB
        await db.query(
            'INSERT INTO ai_hints (user_id, exercise_id, hint_number, hint_text, hint_mode) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, exercise_id, hint_number, hint_mode) DO UPDATE SET hint_text = $4',
            [userId, id, hintNumber, hintText, hintMode]
        );

        res.json({ hint: hintText });
    } catch (error) {
        console.error('Generate AI hint error:', error);
        res.status(500).json({ error: 'Failed to generate hint' });
    }
};

// AI Complexity Analysis
const getComplexityAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const { code } = req.body;
        const userId = req.user.id;

        if (!code || code.trim().length === 0) {
            return res.status(400).json({ error: 'No code provided' });
        }

        // Get exercise details
        const exerciseResult = await db.query('SELECT * FROM exercises WHERE id = $1', [id]);
        if (exerciseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        const exercise = exerciseResult.rows[0];

        // Analyze via OpenAI
        const analysis = await analyzeComplexity({
            exerciseTitle: exercise.title,
            exerciseDescription: exercise.description,
            language: exercise.language,
            code,
        });

        // Update completion status based on optimality
        if (analysis.isOptimal) {
            if (exercise.requires_efficiency) {
                // Upgrade from inefficient (80%) to completed (100%)
                await db.query(
                    `UPDATE user_progress 
                     SET completion_status = 'completed', best_score = 100
                     WHERE user_id = $1 AND exercise_id = $2`,
                    [userId, id]
                );
            } else {
                // Award efficiency star for non-required exercises
                await db.query(
                    `UPDATE user_progress 
                     SET efficiency_star = TRUE
                     WHERE user_id = $1 AND exercise_id = $2`,
                    [userId, id]
                );
            }
        }

        // Save analysis
        await db.query(
            `INSERT INTO ai_complexity_analysis (user_id, exercise_id, code_snapshot, time_complexity, space_complexity, explanation, suggestions)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, id, code, analysis.timeComplexity, analysis.spaceComplexity, analysis.explanation, analysis.suggestions || null]
        );

        res.json({
            ...analysis,
            requires_efficiency: exercise.requires_efficiency,
        });
    } catch (error) {
        console.error('Complexity analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze complexity' });
    }
};

// Start a timed session for an exercise
const startTimedSession = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get exercise to check time limit
        const exerciseResult = await db.query('SELECT * FROM exercises WHERE id = $1', [id]);
        if (exerciseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        const exercise = exerciseResult.rows[0];
        if (!exercise.time_limit_minutes) {
            return res.status(400).json({ error: 'This exercise does not have a time limit' });
        }

        // Check if session already exists
        const existingSession = await db.query(
            'SELECT * FROM exam_sessions WHERE user_id = $1 AND exercise_id = $2',
            [userId, id]
        );

        if (existingSession.rows.length > 0) {
            // Return existing session
            return res.json(existingSession.rows[0]);
        }

        // Create new session
        const expiresAt = new Date(Date.now() + exercise.time_limit_minutes * 60 * 1000);
        const result = await db.query(
            `INSERT INTO exam_sessions (user_id, exercise_id, started_at, expires_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
             RETURNING *`,
            [userId, id, expiresAt]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Start timed session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get timed session status
const getTimedSession = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            'SELECT * FROM exam_sessions WHERE user_id = $1 AND exercise_id = $2',
            [userId, id]
        );

        if (result.rows.length === 0) {
            return res.json({ session: null });
        }

        const session = result.rows[0];
        const now = new Date();
        const expired = now > new Date(session.expires_at);

        if (expired && !session.time_expired) {
            await db.query(
                'UPDATE exam_sessions SET time_expired = TRUE WHERE id = $1',
                [session.id]
            );
            session.time_expired = true;
        }

        res.json({ session });
    } catch (error) {
        console.error('Get timed session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const VIOLATION_LOCKOUT_THRESHOLD = 3;

// Record a focus violation (tab switch / fullscreen exit) during a timed session.
// At VIOLATION_LOCKOUT_THRESHOLD violations, locks the session and notifies the professor.
const recordViolation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Increment violation counter (only on active, unlocked sessions)
        const result = await db.query(`
            UPDATE exam_sessions
            SET tab_switches = COALESCE(tab_switches, 0) + 1,
                last_violation_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND exercise_id = $2
              AND time_expired = FALSE AND COALESCE(locked_by_flag, FALSE) = FALSE
            RETURNING tab_switches, id
        `, [userId, id]);

        if (result.rows.length === 0) {
            // Session is already locked or expired — return current state
            const cur = await db.query(
                'SELECT tab_switches, locked_by_flag FROM exam_sessions WHERE user_id = $1 AND exercise_id = $2',
                [userId, id]
            );
            return res.json({
                tab_switches: cur.rows[0]?.tab_switches || 0,
                locked: cur.rows[0]?.locked_by_flag || false,
            });
        }

        const { tab_switches, id: sessionId } = result.rows[0];
        let locked = false;

        if (tab_switches >= VIOLATION_LOCKOUT_THRESHOLD) {
            // Lock the session
            await db.query(`
                UPDATE exam_sessions
                SET locked_by_flag = TRUE, locked_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [sessionId]);
            locked = true;

            // Find exercise + professor + student info for the notification
            const info = await db.query(`
                SELECT e.title AS exercise_title,
                       e.course_id,
                       c.created_by AS professor_id,
                       u.username AS student_name
                FROM exercises e
                JOIN courses c ON c.id = e.course_id
                JOIN users u ON u.id = $2
                WHERE e.id = $1
            `, [id, userId]);

            if (info.rows.length > 0) {
                const { exercise_title, course_id, professor_id, student_name } = info.rows[0];
                await createNotification({
                    userId: professor_id,
                    type: 'cheating_flag',
                    title: 'Student Flagged — Session Locked',
                    message: `"${student_name}" was locked out of "${exercise_title}" after ${tab_switches} focus violations. Review and unlock from the course students page.`,
                    link: `/professor/course/${course_id}/students?student=${userId}`,
                    courseId: course_id,
                    exerciseId: parseInt(id),
                    fromUserId: userId,
                });
            }
        }

        res.json({ tab_switches, locked });
    } catch (error) {
        console.error('Record violation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: unlock a student's locked timed session
const unlockSession = async (req, res) => {
    try {
        const { exerciseId, userId: studentId } = req.params;
        const professorId = req.user.id;

        // Verify the professor owns this exercise's course
        const exRow = await db.query(`
            SELECT e.title, e.course_id, c.created_by
            FROM exercises e JOIN courses c ON c.id = e.course_id
            WHERE e.id = $1
        `, [exerciseId]);

        if (exRow.rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });
        if (exRow.rows[0].created_by !== professorId) return res.status(403).json({ error: 'Not authorized' });

        const result = await db.query(`
            UPDATE exam_sessions
            SET locked_by_flag = FALSE,
                tab_switches   = 0,
                unlocked_by    = $3,
                unlocked_at    = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND exercise_id = $2
            RETURNING *
        `, [studentId, exerciseId, professorId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No timed session found for this student' });
        }

        // Notify the student they can resume
        await createNotification({
            userId: parseInt(studentId),
            type: 'session_unlocked',
            title: 'Exercise Unlocked',
            message: `Your timed session for "${exRow.rows[0].title}" has been unlocked by your professor. You may now resume.`,
            link: `/exercises/${exerciseId}`,
            exerciseId: parseInt(exerciseId),
            fromUserId: professorId,
        });

        res.json({ message: 'Session unlocked', session: result.rows[0] });
    } catch (error) {
        console.error('Unlock session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============= Multi-file Exercise File Management =============

// Professor: Get all files for an exercise
const getExerciseFiles = async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const exercise = await db.query(`
            SELECT e.*, c.created_by 
            FROM exercises e 
            JOIN courses c ON e.course_id = c.id 
            WHERE e.id = $1
        `, [exerciseId]);

        if (exercise.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        if (exercise.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await db.query(
            'SELECT * FROM exercise_files WHERE exercise_id = $1 ORDER BY display_order, id',
            [exerciseId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get exercise files error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Add a file to a multi-file exercise
const addExerciseFile = async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const { filename, starter_code, is_entry_point, display_order } = req.body;
        const userId = req.user.id;

        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        // Verify ownership
        const exercise = await db.query(`
            SELECT e.*, c.created_by 
            FROM exercises e 
            JOIN courses c ON e.course_id = c.id 
            WHERE e.id = $1
        `, [exerciseId]);

        if (exercise.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        if (exercise.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // If marking as entry point, unset others
        if (is_entry_point) {
            await db.query(
                'UPDATE exercise_files SET is_entry_point = FALSE WHERE exercise_id = $1',
                [exerciseId]
            );
        }

        const result = await db.query(
            'INSERT INTO exercise_files (exercise_id, filename, starter_code, is_entry_point, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [exerciseId, filename, starter_code || '', is_entry_point || false, display_order ?? 0]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'A file with this name already exists in the exercise' });
        }
        console.error('Add exercise file error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Update an exercise file
const updateExerciseFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { filename, starter_code, is_entry_point, display_order } = req.body;
        const userId = req.user.id;

        // Verify ownership
        const file = await db.query(`
            SELECT ef.*, c.created_by 
            FROM exercise_files ef 
            JOIN exercises e ON ef.exercise_id = e.id
            JOIN courses c ON e.course_id = c.id 
            WHERE ef.id = $1
        `, [fileId]);

        if (file.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        if (file.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // If marking as entry point, unset others
        if (is_entry_point) {
            await db.query(
                'UPDATE exercise_files SET is_entry_point = FALSE WHERE exercise_id = $1',
                [file.rows[0].exercise_id]
            );
        }

        const result = await db.query(`
            UPDATE exercise_files 
            SET filename = COALESCE($1, filename),
                starter_code = COALESCE($2, starter_code),
                is_entry_point = COALESCE($3, is_entry_point),
                display_order = COALESCE($4, display_order),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `, [filename, starter_code, is_entry_point, display_order, fileId]);

        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'A file with this name already exists in the exercise' });
        }
        console.error('Update exercise file error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Delete an exercise file
const deleteExerciseFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const file = await db.query(`
            SELECT ef.*, c.created_by 
            FROM exercise_files ef 
            JOIN exercises e ON ef.exercise_id = e.id
            JOIN courses c ON e.course_id = c.id 
            WHERE ef.id = $1
        `, [fileId]);

        if (file.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        if (file.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.query('DELETE FROM exercise_files WHERE id = $1', [fileId]);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete exercise file error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── Bulk Import Exercises ─────────────────────────────────────────────────────
const bulkImportExercises = async (req, res) => {
    const client = await db.connect();
    try {
        const { courseId, exercises } = req.body;
        const userId = req.user.id;

        if (!courseId || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: 'courseId and a non-empty exercises array are required' });
        }

        // Verify course ownership
        const courseCheck = await client.query(
            'SELECT * FROM courses WHERE id = $1 AND created_by = $2',
            [courseId, userId]
        );
        if (courseCheck.rows.length === 0 && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to add exercises to this course' });
        }

        // Fetch chapters for this course to resolve chapter names
        const chaptersResult = await client.query(
            'SELECT id, title FROM chapters WHERE course_id = $1',
            [courseId]
        );
        const chapterMap = {};
        chaptersResult.rows.forEach(ch => {
            chapterMap[ch.title.toLowerCase().trim()] = ch.id;
        });

        await client.query('BEGIN');

        const created = [];
        const errors = [];

        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            try {
                // Validate required fields
                if (!ex.title || !ex.description) {
                    errors.push({ index: i, title: ex.title || `Exercise ${i + 1}`, error: 'Title and description are required' });
                    continue;
                }

                // Resolve chapter_id from chapter name or id
                let chapterId = null;
                if (ex.chapter_id) {
                    chapterId = ex.chapter_id;
                } else if (ex.chapter) {
                    chapterId = chapterMap[ex.chapter.toLowerCase().trim()] || null;
                }

                const difficulty = ex.difficulty || 'easy';
                const language = ex.language || 'javascript';
                const starterCode = ex.is_multi_file ? null : (ex.starterCode || ex.starter_code || '');
                const requiresEfficiency = ex.requires_efficiency || ex.requiresEfficiency || false;
                const timeLimitMinutes = ex.time_limit_minutes || ex.timeLimitMinutes || null;
                const isMultiFile = ex.is_multi_file || ex.isMultiFile || false;

                const exerciseResult = await client.query(
                    `INSERT INTO exercises (course_id, title, description, difficulty, starter_code, language, chapter_id, requires_efficiency, time_limit_minutes, is_multi_file)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                    [courseId, ex.title, ex.description, difficulty, starterCode, language, chapterId, requiresEfficiency, timeLimitMinutes, isMultiFile]
                );

                const exercise = exerciseResult.rows[0];

                // Create exercise files if multi-file
                if (isMultiFile && ex.files && ex.files.length > 0) {
                    for (let j = 0; j < ex.files.length; j++) {
                        const file = ex.files[j];
                        await client.query(
                            'INSERT INTO exercise_files (exercise_id, filename, starter_code, is_entry_point, display_order) VALUES ($1, $2, $3, $4, $5)',
                            [exercise.id, file.filename, file.starter_code || file.starterCode || '', file.is_entry_point || file.isEntryPoint || false, file.display_order ?? j]
                        );
                    }
                }

                // Create test cases
                const testCases = ex.testCases || ex.test_cases || [];
                for (const tc of testCases) {
                    await client.query(
                        'INSERT INTO test_cases (exercise_id, input, expected_output, is_hidden, weight) VALUES ($1, $2, $3, $4, $5)',
                        [exercise.id, tc.input, tc.expectedOutput || tc.expected_output, tc.isHidden || tc.is_hidden || false, tc.weight || 1]
                    );
                }

                created.push({ index: i, id: exercise.id, title: exercise.title });
            } catch (err) {
                errors.push({ index: i, title: ex.title || `Exercise ${i + 1}`, error: err.message });
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: `Successfully imported ${created.length} exercise(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
            created,
            errors,
            total: exercises.length,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Bulk import exercises error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
        client.release();
    }
};

// ─── Bulk Export Exercises ──────────────────────────────────────────────────────
const bulkExportExercises = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify course ownership
        const courseCheck = await db.query(
            'SELECT * FROM courses WHERE id = $1 AND created_by = $2',
            [courseId, userId]
        );
        if (courseCheck.rows.length === 0 && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Get all exercises for this course
        const exercisesResult = await db.query(
            'SELECT * FROM exercises WHERE course_id = $1 ORDER BY id',
            [courseId]
        );

        // Get chapters
        const chaptersResult = await db.query(
            'SELECT id, title FROM chapters WHERE course_id = $1',
            [courseId]
        );
        const chapterIdToName = {};
        chaptersResult.rows.forEach(ch => {
            chapterIdToName[ch.id] = ch.title;
        });

        const exercises = [];

        for (const ex of exercisesResult.rows) {
            // Get test cases
            const testCasesResult = await db.query(
                'SELECT input, expected_output, is_hidden, weight FROM test_cases WHERE exercise_id = $1 ORDER BY id',
                [ex.id]
            );

            // Get exercise files if multi-file
            let files = [];
            if (ex.is_multi_file) {
                const filesResult = await db.query(
                    'SELECT filename, starter_code, is_entry_point, display_order FROM exercise_files WHERE exercise_id = $1 ORDER BY display_order, id',
                    [ex.id]
                );
                files = filesResult.rows;
            }

            exercises.push({
                title: ex.title,
                description: ex.description,
                difficulty: ex.difficulty,
                language: ex.language,
                starterCode: ex.starter_code || '',
                chapter: ex.chapter_id ? (chapterIdToName[ex.chapter_id] || null) : null,
                requires_efficiency: ex.requires_efficiency || false,
                time_limit_minutes: ex.time_limit_minutes || null,
                is_multi_file: ex.is_multi_file || false,
                files: files.length > 0 ? files : undefined,
                testCases: testCasesResult.rows.map(tc => ({
                    input: tc.input,
                    expectedOutput: tc.expected_output,
                    isHidden: tc.is_hidden,
                    weight: tc.weight,
                })),
            });
        }

        res.json({
            courseId: parseInt(courseId),
            courseTitle: courseCheck.rows[0]?.title || '',
            exportedAt: new Date().toISOString(),
            exercises,
        });
    } catch (error) {
        console.error('Bulk export exercises error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getExerciseById,
    createExercise,
    updateExercise,
    deleteExercise,
    submitSolution,
    getJobResult,
    getUserSubmissions,
    getSubmissionDetail,
    addTestCase,
    updateTestCase,
    deleteTestCase,
    getExerciseTestCases,
    getAIHints,
    generateAIHint,
    getComplexityAnalysis,
    startTimedSession,
    getTimedSession,
    recordViolation,
    unlockSession,
    // Multi-file exercise management
    getExerciseFiles,
    addExerciseFile,
    updateExerciseFile,
    deleteExerciseFile,
    // Bulk import/export
    bulkImportExercises,
    bulkExportExercises,
};
