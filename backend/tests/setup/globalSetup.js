// Jest globalSetup for INTEGRATION tests: (re)creates a clean test database and
// loads the schema from database/SCHEMA_UPDATED.sql. Runs once before the suite.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

const DB_NAME = process.env.DB_NAME || 'code_learning_test';
const conn = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
};

module.exports = async () => {
    if (!/test/i.test(DB_NAME)) {
        throw new Error(`Refusing to run: DB_NAME "${DB_NAME}" does not look like a test database.`);
    }

    // Connect to the maintenance database to drop/create the test DB.
    const admin = new Client({ ...conn, database: 'postgres' });
    await admin.connect();
    await admin.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [DB_NAME]
    );
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.query(`CREATE DATABASE ${DB_NAME}`);
    await admin.end();

    // Load the schema into the freshly created database.
    const schema = fs.readFileSync(
        path.resolve(__dirname, '../../../database/SCHEMA_UPDATED.sql'),
        'utf8'
    );
    const db = new Client({ ...conn, database: DB_NAME });
    await db.connect();
    await db.query(schema);
    await db.end();

    // eslint-disable-next-line no-console
    console.log(`\n[test] schema loaded into "${DB_NAME}"`);
};
