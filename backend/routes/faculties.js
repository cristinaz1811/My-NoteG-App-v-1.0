const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { authMiddleware, isProfessor } = require('../middleware/auth');

// Get all faculties (public)
router.get('/', facultyController.getAll);

// Create faculty (professors only)
router.post('/', authMiddleware, isProfessor, facultyController.create);

// Update faculty (professors only)
router.put('/:id', authMiddleware, isProfessor, facultyController.update);

// Delete faculty (professors only)
router.delete('/:id', authMiddleware, isProfessor, facultyController.remove);

module.exports = router;
