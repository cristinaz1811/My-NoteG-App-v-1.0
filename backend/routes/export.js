const express = require('express');
const router = express.Router();
const {
    exportCourseGradesCSV,
    exportCourseGradesPDF,
    exportStudentProgressCSV,
    exportStudentProgressPDF,
    exportStudentDetailCSV,
    exportStudentDetailPDF,
} = require('../controllers/exportController');
const { authMiddleware, isProfessor } = require('../middleware/auth');

// ─── Professor: export all student grades for a course ──────────────────────
router.get('/professor/course/:courseId/csv', authMiddleware, isProfessor, exportCourseGradesCSV);
router.get('/professor/course/:courseId/pdf', authMiddleware, isProfessor, exportCourseGradesPDF);

// ─── Professor: export a single student's detailed report ───────────────────
router.get('/professor/course/:courseId/student/:studentId/csv', authMiddleware, isProfessor, exportStudentDetailCSV);
router.get('/professor/course/:courseId/student/:studentId/pdf', authMiddleware, isProfessor, exportStudentDetailPDF);

// ─── Student: export own progress ───────────────────────────────────────────
router.get('/my-progress/csv', authMiddleware, exportStudentProgressCSV);
router.get('/my-progress/pdf', authMiddleware, exportStudentProgressPDF);

module.exports = router;
