const db = require('../config/database');

const runMigration = async () => {
    const queries = [
        `ALTER TABLE courses ADD COLUMN IF NOT EXISTS ai_hint_guidance TEXT`,
        `ALTER TABLE courses ADD COLUMN IF NOT EXISTS ai_hint_mode VARCHAR(20) DEFAULT 'none'`,
    ];

    console.log('Running migration: add ai_hint_guidance and ai_hint_mode to courses...');

    for (const query of queries) {
        try {
            await db.query(query);
            console.log('✓ Executed:', query);
        } catch (err) {
            if (err.code === '42701') {
                console.log('⊘ Already exists:', query);
            } else {
                console.error('✗ Failed:', query);
                console.error('  Error:', err.message);
                process.exit(1);
            }
        }
    }

    console.log('Migration completed!');
    process.exit(0);
};

runMigration();
