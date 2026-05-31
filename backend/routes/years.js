const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth, isProfessor } = require('../middleware/auth');
const {
    getYears,
    getYearById,
    createYear,
    updateYear,
    deleteYear,
    getClassesByYear,
    createClass,
} = require('../controllers/yearController');

router.get('/', optionalAuth, getYears);
router.get('/:yearId', getYearById);
router.post('/', authMiddleware, isProfessor, createYear);
router.put('/:yearId', authMiddleware, isProfessor, updateYear);
router.delete('/:yearId', authMiddleware, isProfessor, deleteYear);

router.get('/:yearId/classes', optionalAuth, getClassesByYear);
router.post('/:yearId/classes', authMiddleware, isProfessor, createClass);

module.exports = router;
