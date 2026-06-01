const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// ─── Lectures ────────────────────────────────────────────────────────────────

const getLecturesByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const result = await db.query(
            `SELECT l.*,
                    ch.title AS chapter_title,
                    COUNT(lp.id)::int AS page_count,
                    COUNT(lm.id)::int AS media_count
             FROM lectures l
             LEFT JOIN chapters ch ON ch.id = l.chapter_id
             LEFT JOIN lecture_pages lp ON lp.lecture_id = l.id
             LEFT JOIN lecture_media lm ON lm.lecture_id = l.id
             WHERE l.course_id = $1
             GROUP BY l.id, ch.title
             ORDER BY l.order_index, l.id`,
            [courseId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('getLecturesByCourse error:', err);
        res.status(500).json({ error: 'Failed to fetch lectures' });
    }
};

const getLectureById = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const userId = req.user?.id;

        const lectureResult = await db.query(
            `SELECT l.*, ch.title AS chapter_title
             FROM lectures l
             LEFT JOIN chapters ch ON ch.id = l.chapter_id
             WHERE l.id = $1`,
            [lectureId]
        );
        if (lectureResult.rows.length === 0) return res.status(404).json({ error: 'Lecture not found' });

        const pagesResult = await db.query(
            `SELECT * FROM lecture_pages WHERE lecture_id = $1 ORDER BY page_number`,
            [lectureId]
        );
        const mediaResult = await db.query(
            `SELECT * FROM lecture_media WHERE lecture_id = $1 ORDER BY order_index`,
            [lectureId]
        );

        let progress = null;
        if (userId) {
            const progResult = await db.query(
                `SELECT * FROM lecture_progress WHERE user_id = $1 AND lecture_id = $2`,
                [userId, lectureId]
            );
            progress = progResult.rows[0] || null;
        }

        res.json({
            ...lectureResult.rows[0],
            pages: pagesResult.rows,
            media: mediaResult.rows,
            progress,
        });
    } catch (err) {
        console.error('getLectureById error:', err);
        res.status(500).json({ error: 'Failed to fetch lecture' });
    }
};

const createLecture = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { chapter_id, title, description, order_index = 0 } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const result = await db.query(
            `INSERT INTO lectures (course_id, chapter_id, title, description, order_index)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [courseId, chapter_id || null, title, description || null, order_index]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('createLecture error:', err);
        res.status(500).json({ error: 'Failed to create lecture' });
    }
};

const updateLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const { chapter_id, title, description, order_index } = req.body;

        const check = await db.query('SELECT * FROM lectures WHERE id = $1', [lectureId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Lecture not found' });

        const result = await db.query(
            `UPDATE lectures
             SET chapter_id   = COALESCE($1, chapter_id),
                 title        = COALESCE($2, title),
                 description  = COALESCE($3, description),
                 order_index  = COALESCE($4, order_index)
             WHERE id = $5 RETURNING *`,
            [chapter_id, title, description, order_index, lectureId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('updateLecture error:', err);
        res.status(500).json({ error: 'Failed to update lecture' });
    }
};

const deleteLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;

        // Delete associated media files from disk first
        const mediaResult = await db.query(
            'SELECT file_path FROM lecture_media WHERE lecture_id = $1', [lectureId]
        );
        for (const row of mediaResult.rows) {
            const fullPath = path.join(__dirname, '../uploads', row.file_path);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }

        await db.query('DELETE FROM lectures WHERE id = $1', [lectureId]);
        res.json({ message: 'Lecture deleted' });
    } catch (err) {
        console.error('deleteLecture error:', err);
        res.status(500).json({ error: 'Failed to delete lecture' });
    }
};

// ─── Pages ───────────────────────────────────────────────────────────────────

const addPage = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const { title, content = '', page_number } = req.body;

        // Default to appending after the last page
        let pageNum = page_number;
        if (!pageNum) {
            const maxResult = await db.query(
                'SELECT COALESCE(MAX(page_number), 0) AS max FROM lecture_pages WHERE lecture_id = $1',
                [lectureId]
            );
            pageNum = maxResult.rows[0].max + 1;
        }

        const result = await db.query(
            `INSERT INTO lecture_pages (lecture_id, title, content, page_number)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [lectureId, title || null, content, pageNum]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('addPage error:', err);
        res.status(500).json({ error: 'Failed to add page' });
    }
};

const updatePage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { title, content } = req.body;

        const result = await db.query(
            `UPDATE lecture_pages
             SET title      = COALESCE($1, title),
                 content    = COALESCE($2, content),
                 updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [title, content, pageId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('updatePage error:', err);
        res.status(500).json({ error: 'Failed to update page' });
    }
};

const deletePage = async (req, res) => {
    try {
        const { pageId } = req.params;
        await db.query('DELETE FROM lecture_pages WHERE id = $1', [pageId]);
        res.json({ message: 'Page deleted' });
    } catch (err) {
        console.error('deletePage error:', err);
        res.status(500).json({ error: 'Failed to delete page' });
    }
};

// ─── Media ───────────────────────────────────────────────────────────────────

const uploadMedia = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const { media_type, title, order_index = 0 } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No file uploaded' });
        if (!media_type) return res.status(400).json({ error: 'media_type is required' });
        if (!title) return res.status(400).json({ error: 'title is required' });

        const isVideo = file.mimetype.startsWith('video/');
        const subDir = isVideo ? 'videos' : 'documents';
        const filePath = `${subDir}/${file.filename}`;
        const fileUrl = `/uploads/${filePath}`;

        const result = await db.query(
            `INSERT INTO lecture_media
                (lecture_id, media_type, title, file_path, file_url, file_size_bytes, mime_type, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [lectureId, media_type, title, filePath, fileUrl, file.size, file.mimetype, order_index]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('uploadMedia error:', err);
        res.status(500).json({ error: 'Failed to upload media' });
    }
};

const deleteMedia = async (req, res) => {
    try {
        const { mediaId } = req.params;

        const result = await db.query(
            'SELECT file_path FROM lecture_media WHERE id = $1', [mediaId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Media not found' });

        const fullPath = path.join(__dirname, '../uploads', result.rows[0].file_path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

        await db.query('DELETE FROM lecture_media WHERE id = $1', [mediaId]);
        res.json({ message: 'Media deleted' });
    } catch (err) {
        console.error('deleteMedia error:', err);
        res.status(500).json({ error: 'Failed to delete media' });
    }
};

// ─── Student Progress ─────────────────────────────────────────────────────────

const updateProgress = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const { last_page_seen, completed } = req.body;
        const userId = req.user.id;

        const totalPages = await db.query(
            'SELECT COUNT(*) FROM lecture_pages WHERE lecture_id = $1', [lectureId]
        );
        const total = parseInt(totalPages.rows[0].count);
        const isCompleted = completed || (last_page_seen >= total && total > 0);

        const result = await db.query(
            `INSERT INTO lecture_progress (user_id, lecture_id, last_page_seen, completed, completed_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, lecture_id) DO UPDATE
             SET last_page_seen = GREATEST(lecture_progress.last_page_seen, EXCLUDED.last_page_seen),
                 completed      = EXCLUDED.completed OR lecture_progress.completed,
                 completed_at   = CASE
                     WHEN NOT lecture_progress.completed AND EXCLUDED.completed THEN NOW()
                     ELSE lecture_progress.completed_at
                 END
             RETURNING *`,
            [userId, lectureId, last_page_seen, isCompleted, isCompleted ? new Date() : null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('updateProgress error:', err);
        res.status(500).json({ error: 'Failed to update progress' });
    }
};

module.exports = {
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
};
