// Test data factories + JWT helper for integration tests.
// All inserts go through the app's db layer (config/database.js).
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');

let seq = 0;
const uniq = (p) => `${p}_${Date.now().toString(36)}_${seq++}`;

async function createFaculty(overrides = {}) {
    const name = overrides.name || uniq('Faculty');
    const domain = overrides.email_domain || `${uniq('dom')}.edu`;
    const { rows } = await db.query(
        `INSERT INTO faculties (name, email_domain) VALUES ($1, $2) RETURNING *`,
        [name, domain]
    );
    return rows[0];
}

// Creates a user row. Pass `password` to control the plaintext (default 'Passw0rd!').
async function createUser(overrides = {}) {
    const role = overrides.role === 'professor' ? 'professor' : 'student';
    const username = overrides.username || uniq(role);
    const email = overrides.email || `${username}@test.edu`;
    const password = overrides.password || 'Passw0rd!';
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
        `INSERT INTO users (username, email, password_hash, role, email_verified, faculty_id)
         VALUES ($1, $2, $3, $4, true, $5) RETURNING *`,
        [username, email, hash, role, overrides.faculty_id || null]
    );
    return { ...rows[0], _password: password };
}

// Signs a JWT identical in shape to authController (id, username, role, faculty_id).
function signTestToken(user, opts = {}) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role, faculty_id: user.faculty_id || null },
        process.env.JWT_SECRET,
        { expiresIn: opts.expiresIn || '1h' }
    );
}

function authHeader(user) {
    return `Bearer ${signTestToken(user)}`;
}

async function createCourse(createdBy, overrides = {}) {
    const isPrivate = overrides.is_private || false;
    const { rows } = await db.query(
        `INSERT INTO courses (title, description, difficulty, language, created_by, is_private, enrollment_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
            overrides.title || uniq('Course'),
            overrides.description || 'Test course',
            overrides.difficulty || 'easy',
            overrides.language || 'javascript',
            createdBy,
            isPrivate,
            isPrivate ? (overrides.enrollment_code || uniq('CODE').slice(0, 8).toUpperCase()) : null,
        ]
    );
    return rows[0];
}

async function createExercise(courseId, overrides = {}) {
    const { rows } = await db.query(
        `INSERT INTO exercises (course_id, title, description, difficulty, language, starter_code,
            requires_efficiency, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
            courseId,
            overrides.title || uniq('Exercise'),
            overrides.description || 'Return the sum of two numbers.',
            overrides.difficulty || 'easy',
            overrides.language || 'javascript',
            overrides.starter_code || '',
            overrides.requires_efficiency || false,
            overrides.is_published !== false,
        ]
    );
    const exercise = rows[0];
    const testCases = overrides.testCases || [];
    for (const tc of testCases) {
        await db.query(
            `INSERT INTO test_cases (exercise_id, input, expected_output, is_hidden, weight)
             VALUES ($1, $2, $3, $4, $5)`,
            [exercise.id, tc.input, tc.expected_output, tc.is_hidden || false, tc.weight || 1]
        );
    }
    return exercise;
}

async function enroll(userId, courseId) {
    await db.query(
        `INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)
         ON CONFLICT (user_id, course_id) DO NOTHING`,
        [userId, courseId]
    );
}

module.exports = {
    createFaculty,
    createUser,
    signTestToken,
    authHeader,
    createCourse,
    createExercise,
    enroll,
};
