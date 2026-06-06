const db = require('../config/database');

// Extract email domain from email address
const extractEmailDomain = (email) => {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
};

// Get faculty by email domain
const getFacultyByEmailDomain = async (email) => {
    const domain = extractEmailDomain(email);
    if (!domain) return null;

    const result = await db.query(
        'SELECT id, name FROM faculties WHERE email_domain = $1',
        [domain]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
};

// Get all faculties
const getAllFaculties = async () => {
    const result = await db.query(
        'SELECT id, name, email_domain, description, created_at FROM faculties ORDER BY name ASC'
    );
    return result.rows;
};

// Create a new faculty
const createFaculty = async (name, emailDomain, description) => {
    const result = await db.query(
        `INSERT INTO faculties (name, email_domain, description)
         VALUES ($1, $2, $3)
         RETURNING id, name, email_domain, description, created_at`,
        [name, emailDomain.toLowerCase(), description || null]
    );
    return result.rows[0];
};

// Update a faculty
const updateFaculty = async (id, name, emailDomain, description) => {
    const result = await db.query(
        `UPDATE faculties
         SET name = $1, email_domain = $2, description = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, name, email_domain, description, created_at, updated_at`,
        [name, emailDomain.toLowerCase(), description || null, id]
    );
    return result.rows[0];
};

// Delete a faculty
const deleteFaculty = async (id) => {
    const result = await db.query(
        'DELETE FROM faculties WHERE id = $1 RETURNING id',
        [id]
    );
    return result.rows.length > 0;
};

module.exports = {
    extractEmailDomain,
    getFacultyByEmailDomain,
    getAllFaculties,
    createFaculty,
    updateFaculty,
    deleteFaculty
};
