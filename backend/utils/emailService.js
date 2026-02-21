const nodemailer = require('nodemailer');

// Create transporter - using environment variables
const createTransporter = () => {
    // For Gmail, you need to enable "Less secure app access" or use App Passwords
    // For production, consider using services like SendGrid, Mailgun, or AWS SES
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendVerificationEmail = async (email, username, verificationToken) => {
    const transporter = createTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
        from: `"NoteG Learning" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your NoteG account',
        html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #1a1a2e; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #fef483; margin: 0;">Welcome to NoteG!</h1>
                </div>
                
                <div style="background: #232a36; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                    <h2 style="color: #ffffff; margin-top: 0;">Hi ${username}!</h2>
                    <p style="color: #9ca3af; line-height: 1.6;">
                        Thanks for joining NoteG! Please verify your email address to complete your registration 
                        and start your learning journey.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background: linear-gradient(135deg, #a1609d, #b870ad); 
                                  color: white; 
                                  padding: 14px 32px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px;">
                        If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="color: #a1609d; font-size: 14px; word-break: break-all;">
                        ${verificationUrl}
                    </p>
                </div>
                
                <div style="text-align: center; color: #6b7280; font-size: 12px;">
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                </div>
            </div>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (email, username, resetToken) => {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
        from: `"NoteG Learning" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Reset your NoteG password',
        html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #1a1a2e; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #fef483; margin: 0;">Password Reset</h1>
                </div>
                
                <div style="background: #232a36; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                    <h2 style="color: #ffffff; margin-top: 0;">Hi ${username}!</h2>
                    <p style="color: #9ca3af; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background: linear-gradient(135deg, #a1609d, #b870ad); 
                                  color: white; 
                                  padding: 14px 32px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px;">
                        If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="color: #a1609d; font-size: 14px; word-break: break-all;">
                        ${resetUrl}
                    </p>
                </div>
                
                <div style="text-align: center; color: #6b7280; font-size: 12px;">
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, you can safely ignore this email.</p>
                </div>
            </div>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
