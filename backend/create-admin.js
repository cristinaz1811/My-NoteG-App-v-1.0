const bcrypt = require('bcrypt');
const { query } = require('./config/database');

async function createAdmin() {
    try {
        const password = 'admin123'; // Change this to whatever you want
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update the admin user with the real password hash
        await query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [passwordHash, 'admin@codelearning.com']
        );

        console.log('✅ Admin account updated successfully!');
        console.log('-----------------------------------');
        console.log('Email: admin@codelearning.com');
        console.log('Password: admin123');
        console.log('Role: admin');
        console.log('-----------------------------------');
        console.log('You can now login with these credentials');
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();
