const express = require('express');
const router = express.Router();
const {
    getExerciseById,
    createExercise,
    submitSolution,
    getUserSubmissions,
} = require('../controllers/exerciseController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.get('/:id', authMiddleware, getExerciseById);
router.post('/', authMiddleware, isAdmin, createExercise);
router.post('/:id/submit', authMiddleware, submitSolution);
router.get('/:exerciseId/submissions', authMiddleware, getUserSubmissions);

module.exports = router;
