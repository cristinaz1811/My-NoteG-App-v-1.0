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
        const { courseId, title, description, difficulty, starterCode, language, testCases, chapter_id } = req.body;

        // Create exercise
        const exerciseResult = await db.query(
            `INSERT INTO exercises (course_id, title, description, difficulty, starter_code, language, chapter_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [courseId, title, description, difficulty, starterCode, language, chapter_id || null]
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

// Professor: Update exercise
const updateExercise = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, difficulty, starter_code, language, chapter_id, order_index } = req.body;
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

        const result = await db.query(`
            UPDATE exercises 
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                difficulty = COALESCE($3, difficulty),
                starter_code = COALESCE($4, starter_code),
                language = COALESCE($5, language),
                chapter_id = COALESCE($6, chapter_id),
                order_index = COALESCE($7, order_index),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [title, description, difficulty, starter_code, language, chapter_id, order_index, id]);

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

module.exports = {
    getExerciseById,
    createExercise,
    updateExercise,
    deleteExercise,
    submitSolution,
    getUserSubmissions,
    addTestCase,
    updateTestCase,
    deleteTestCase,
    getExerciseTestCases,
};
