const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const DOCUMENT_TYPES = [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/vnd.ms-powerpoint', // ppt
    'application/pdf',
];

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const isVideo = VIDEO_TYPES.includes(file.mimetype);
        cb(null, path.join(__dirname, '../uploads', isVideo ? 'videos' : 'documents'));
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const uid = crypto.randomBytes(16).toString('hex');
        cb(null, `${uid}${ext}`);
    },
});

function fileFilter(req, file, cb) {
    const allowed = [...VIDEO_TYPES, ...DOCUMENT_TYPES];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
}

const uploadMedia = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB cap; videos are the largest
    },
});

module.exports = { uploadMedia };
