const express = require('express');
const router = express.Router();
const {
    getExerciseById,
    createExercise,
    updateExercise,
    deleteExercise,
    submitSolution,
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
    getExerciseFiles,
    addExerciseFile,
    updateExerciseFile,
    deleteExerciseFile,
} = require('../controllers/exerciseController');
const { authMiddleware, isAdmin, isProfessor } = require('../middleware/auth');

// Student routes
router.get('/submissions/:submissionId/detail', authMiddleware, getSubmissionDetail);
router.get('/:id', authMiddleware, getExerciseById);
router.post('/:id/submit', authMiddleware, submitSolution);
router.get('/:exerciseId/submissions', authMiddleware, getUserSubmissions);

// Timed session routes
router.post('/:id/timed-session/start', authMiddleware, startTimedSession);
router.get('/:id/timed-session', authMiddleware, getTimedSession);

// AI Hints routes
router.get('/:id/ai-hints', authMiddleware, getAIHints);
router.post('/:id/ai-hints/generate', authMiddleware, generateAIHint);
router.post('/:id/ai-complexity', authMiddleware, getComplexityAnalysis);

// Professor routes - Exercise management
router.post('/professor/create', authMiddleware, isProfessor, createExercise);
router.put('/professor/:id', authMiddleware, isProfessor, updateExercise);
router.delete('/professor/:id', authMiddleware, isProfessor, deleteExercise);

// Professor routes - Test case management
router.get('/professor/:exerciseId/test-cases', authMiddleware, isProfessor, getExerciseTestCases);
router.post('/professor/:exerciseId/test-cases', authMiddleware, isProfessor, addTestCase);
router.put('/professor/test-cases/:testCaseId', authMiddleware, isProfessor, updateTestCase);
router.delete('/professor/test-cases/:testCaseId', authMiddleware, isProfessor, deleteTestCase);

// Professor routes - Multi-file exercise file management
router.get('/professor/:exerciseId/files', authMiddleware, isProfessor, getExerciseFiles);
router.post('/professor/:exerciseId/files', authMiddleware, isProfessor, addExerciseFile);
router.put('/professor/files/:fileId', authMiddleware, isProfessor, updateExerciseFile);
router.delete('/professor/files/:fileId', authMiddleware, isProfessor, deleteExerciseFile);

// Legacy admin route
router.post('/', authMiddleware, isAdmin, createExercise);

module.exports = router;
