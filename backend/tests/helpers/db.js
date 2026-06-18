// Shared DB helpers for integration tests. Reuses the app's pool (config/database.js)
// so tests exercise the exact same connection layer as production code.
const db = require('../../config/database');

// Truncate all data between tests for isolation, keeping the schema intact.
async function truncateAll() {
    const { rows } = await db.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
    `);
    if (rows.length === 0) return;
    const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
    await db.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

// Close the pool so Jest can exit cleanly (call from afterAll).
async function closePool() {
    await db.pool.end();
}

module.exports = { db, truncateAll, closePool };
