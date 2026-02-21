require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('Testing email configuration...\n');
    console.log('Email Service:', process.env.EMAIL_SERVICE);
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass:', process.env.EMAIL_PASS ? '****' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET');
    console.log('');

    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Verify connection
        console.log('Verifying connection to email server...');
        await transporter.verify();
        console.log('✓ Connection successful!\n');

        // Send test email
        console.log('Sending test email to:', process.env.EMAIL_USER);
        const info = await transporter.sendMail({
            from: `"NoteG Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'NoteG Email Test - It Works!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #a1609d;">Email Configuration Works!</h2>
                    <p>If you're seeing this, your email setup is working correctly.</p>
                    <p>Sent at: ${new Date().toISOString()}</p>
                </div>
            `
        });

        console.log('✓ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('\nCheck your inbox at:', process.env.EMAIL_USER);
        
    } catch (error) {
        console.error('✗ Email test failed!\n');
        console.error('Error:', error.message);
        
        if (error.message.includes('Invalid login')) {
            console.log('\n--- Possible fixes ---');
            console.log('1. For Gmail: Use an App Password, not your regular password');
            console.log('2. For institutional email: Check if SMTP is allowed');
            console.log('3. Verify EMAIL_USER and EMAIL_PASS are correct');
        }
    }
    
    process.exit(0);
};

testEmail();
