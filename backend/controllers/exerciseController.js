const db = require('../config/database');

const getExerciseById = async (req, res) => {
    try {
        const { id } = req.params;

        const exerciseResult = await db.query(
            'SELECT * FROM exercises WHERE id = $1',
            [id]
        );

        if (exerciseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        const testCasesResult = await db.query(
            'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE exercise_id = $1',
            [id]
        );

        // Get user progress if authenticated
        let userProgress = null;
        if (req.user) {
            const progressResult = await db.query(
                'SELECT * FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
                [req.user.id, id]
            );
            userProgress = progressResult.rows[0] || null;
        }

        res.json({
            ...exerciseResult.rows[0],
            testCases: testCasesResult.rows.filter(tc => !tc.is_hidden),
            totalTestCases: testCasesResult.rows.length,
            userProgress,
        });
    } catch (error) {
        console.error('Get exercise error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createExercise = async (req, res) => {
    try {
        const { courseId, title, description, difficulty, starterCode, language, testCases } = req.body;

        // Create exercise
        const exerciseResult = await db.query(
            `INSERT INTO exercises (course_id, title, description, difficulty, starter_code, language) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [courseId, title, description, difficulty, starterCode, language]
        );

        const exercise = exerciseResult.rows[0];

        // Create test cases if provided
        if (testCases && testCases.length > 0) {
            for (const tc of testCases) {
                await db.query(
                    'INSERT INTO test_cases (exercise_id, input, expected_output, is_hidden, weight) VALUES ($1, $2, $3, $4, $5)',
                    [exercise.id, tc.input, tc.expectedOutput, tc.isHidden || false, tc.weight || 1]
                );
            }
        }

        res.status(201).json(exercise);
    } catch (error) {
        console.error('Create exercise error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const submitSolution = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, language } = req.body;
        const userId = req.user.id;

        // Get exercise and test cases
        const exerciseResult = await db.query('SELECT * FROM exercises WHERE id = $1', [id]);
        if (exerciseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        const testCasesResult = await db.query(
            'SELECT * FROM test_cases WHERE exercise_id = $1',
            [id]
        );

        const testCases = testCasesResult.rows;
        
        // Execute code against test cases
        const { executeCode } = require('../utils/codeExecutor');
        const results = await executeCode(code, testCases, language);

        const testsPassed = results.filter(r => r.passed).length;
        const testsTotal = testCases.length;
        const score = (testsPassed / testsTotal) * 100;
        const status = testsPassed === testsTotal ? 'passed' : 'failed';

        // Save submission
        const submissionResult = await db.query(
            `INSERT INTO submissions (user_id, exercise_id, code, language, status, score, tests_passed, tests_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [userId, id, code, language, status, score, testsPassed, testsTotal]
        );

        // Update user progress
        const progressCheck = await db.query(
            'SELECT * FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
            [userId, id]
        );

        if (progressCheck.rows.length === 0) {
            await db.query(
                `INSERT INTO user_progress (user_id, exercise_id, completed, best_score, attempts, last_attempt_at)
                 VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP)`,
                [userId, id, status === 'passed', score]
            );
        } else {
            const currentBestScore = progressCheck.rows[0].best_score;
            const newBestScore = Math.max(currentBestScore, score);
            await db.query(
                `UPDATE user_progress 
                 SET completed = $3, best_score = $4, attempts = attempts + 1, last_attempt_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1 AND exercise_id = $2`,
                [userId, id, status === 'passed' || progressCheck.rows[0].completed, newBestScore]
            );
        }

        res.json({
            submission: submissionResult.rows[0],
            results,
            score,
            testsPassed,
            testsTotal,
        });
    } catch (error) {
        console.error('Submit solution error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const getUserSubmissions = async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            `SELECT id, status, score, tests_passed, tests_total, execution_time, submitted_at
             FROM submissions 
             WHERE user_id = $1 AND exercise_id = $2
             ORDER BY submitted_at DESC
             LIMIT 20`,
            [userId, exerciseId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getExerciseById,
    createExercise,
    submitSolution,
    getUserSubmissions,
};
