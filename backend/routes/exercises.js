const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/exerciseController');
const { authMiddleware, isAdmin, isProfessor } = require('../middleware/auth');

// Student routes
router.get('/:id', authMiddleware, getExerciseById);
router.post('/:id/submit', authMiddleware, submitSolution);
router.get('/:exerciseId/submissions', authMiddleware, getUserSubmissions);

// Professor routes - Exercise management
router.post('/professor/create', authMiddleware, isProfessor, createExercise);
router.put('/professor/:id', authMiddleware, isProfessor, updateExercise);
router.delete('/professor/:id', authMiddleware, isProfessor, deleteExercise);

// Professor routes - Test case management
router.get('/professor/:exerciseId/test-cases', authMiddleware, isProfessor, getExerciseTestCases);
router.post('/professor/:exerciseId/test-cases', authMiddleware, isProfessor, addTestCase);
router.put('/professor/test-cases/:testCaseId', authMiddleware, isProfessor, updateTestCase);
router.delete('/professor/test-cases/:testCaseId', authMiddleware, isProfessor, deleteTestCase);

// Legacy admin route
router.post('/', authMiddleware, isAdmin, createExercise);

module.exports = router;
