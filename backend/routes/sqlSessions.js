const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
    startSession,
    runQuery,
    validateAnswer,
    resetSession,
} = require('../controllers/sqlSessionController');

router.post('/:exerciseId/start',    authMiddleware, startSession);
router.post('/:exerciseId/query',    authMiddleware, runQuery);
router.post('/:exerciseId/validate', authMiddleware, validateAnswer);
router.post('/:exerciseId/reset',    authMiddleware, resetSession);

module.exports = router;
