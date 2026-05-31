const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth, isProfessor } = require('../middleware/auth');
const { uploadMedia: multerUpload } = require('../middleware/upload');
const {
    getLecturesByCourse,
    getLectureById,
    createLecture,
    updateLecture,
    deleteLecture,
    addPage,
    updatePage,
    deletePage,
    uploadMedia,
    deleteMedia,
    updateProgress,
} = require('../controllers/lectureController');

// Lectures CRUD (course-scoped)
router.get('/course/:courseId', optionalAuth, getLecturesByCourse);
router.post('/course/:courseId', authMiddleware, isProfessor, createLecture);

// Single lecture
router.get('/:lectureId', optionalAuth, getLectureById);
router.put('/:lectureId', authMiddleware, isProfessor, updateLecture);
router.delete('/:lectureId', authMiddleware, isProfessor, deleteLecture);

// Pages
router.post('/:lectureId/pages', authMiddleware, isProfessor, addPage);
router.put('/:lectureId/pages/:pageId', authMiddleware, isProfessor, updatePage);
router.delete('/:lectureId/pages/:pageId', authMiddleware, isProfessor, deletePage);

// Media
router.post('/:lectureId/media', authMiddleware, isProfessor, multerUpload.single('file'), uploadMedia);
router.delete('/:lectureId/media/:mediaId', authMiddleware, isProfessor, deleteMedia);

// Student progress
router.post('/:lectureId/progress', authMiddleware, updateProgress);

module.exports = router;
