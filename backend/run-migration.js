const db = require('./config/database');

const runMigration = async () => {
    const queries = [
        // Add email verification fields
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP`,
        
        // Add password reset fields
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP`,
        
        // Add Google OAuth field
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)`,
        
        // Create indexes for faster lookups
        `CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)`,
        `CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)`,
        `CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`
    ];

    console.log('Running migration 004_add_auth_features...');
    
    for (const query of queries) {
        try {
            await db.query(query);
            console.log('✓ Executed:', query.substring(0, 60) + '...');
        } catch (err) {
            if (err.code === '42701') { // column already exists
                console.log('⊘ Already exists:', query.substring(0, 60) + '...');
            } else if (err.code === '42P07') { // index already exists
                console.log('⊘ Index exists:', query.substring(0, 60) + '...');
            } else {
                console.error('✗ Failed:', query);
                console.error('  Error:', err.message);
            }
        }
    }
    
    console.log('Migration completed!');
    process.exit(0);
};

runMigration();
