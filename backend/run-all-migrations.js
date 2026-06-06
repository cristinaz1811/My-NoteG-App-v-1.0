const db = require('./config/database');
const fs = require('fs');
const path = require('path');

const runMigrations = async () => {
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration(s)\n`);

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        console.log(`Running: ${file}`);
        try {
            await db.query(sql);
            console.log(`✓ ${file} completed\n`);
        } catch (error) {
            console.error(`✗ ${file} failed:`);
            console.error(`  ${error.message}\n`);
        }
    }

    console.log('All migrations completed!');
    process.exit(0);
};

runMigrations().catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
});
