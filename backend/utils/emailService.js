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

const sendPlagiarismAlertEmail = async (email, username, courseTitle, exerciseTitle, flaggedPairs, maxSimilarity, reportId) => {
    const transporter = createTransporter();
    const reportUrl = `${process.env.FRONTEND_URL}/professor/plagiarism/report/${reportId}`;

    const mailOptions = {
        from: `"NoteG Learning" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `⚠️ Plagiarism Alert - ${exerciseTitle}`,
        html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #1a1a2e; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #ef4444; margin: 0;">⚠️ Plagiarism Alert</h1>
                </div>
                
                <div style="background: #232a36; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                    <h2 style="color: #ffffff; margin-top: 0;">Hi ${username}!</h2>
                    <p style="color: #9ca3af; line-height: 1.6;">
                        Our plagiarism detection system has found <strong style="color: #ef4444;">${flaggedPairs} suspicious pair(s)</strong> 
                        of similar submissions in your course.
                    </p>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
                        <p style="color: #f87171; margin: 0 0 8px 0; font-weight: bold;">Details:</p>
                        <p style="color: #9ca3af; margin: 4px 0;"><strong>Course:</strong> ${courseTitle}</p>
                        <p style="color: #9ca3af; margin: 4px 0;"><strong>Exercise:</strong> ${exerciseTitle}</p>
                        <p style="color: #9ca3af; margin: 4px 0;"><strong>Max Similarity:</strong> <span style="color: #ef4444; font-weight: bold;">${maxSimilarity.toFixed(1)}%</span></p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${reportUrl}" 
                           style="background: linear-gradient(135deg, #a1609d, #b870ad); 
                                  color: white; 
                                  padding: 14px 32px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            View Full Report
                        </a>
                    </div>
                </div>
                
                <div style="text-align: center; color: #6b7280; font-size: 12px;">
                    <p>Please review the flagged submissions and mark them as plagiarism or coincidence.</p>
                </div>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendEnrollmentRequestEmail = async (professorEmail, professorName, studentName, className, yearName, faculty) => {
    const transporter = createTransporter();
    const reviewUrl = `${process.env.FRONTEND_URL}/professor/enrollment-requests`;

    const mailOptions = {
        from: `"NoteG Learning" <${process.env.EMAIL_USER}>`,
        to: professorEmail,
        subject: `New enrollment request — ${className}`,
        html: `
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#1a1a2e;padding:40px;border-radius:16px;">
                <div style="text-align:center;margin-bottom:30px;">
                    <h1 style="color:#a1609d;margin:0;">Enrollment Request</h1>
                </div>
                <div style="background:#232a36;padding:30px;border-radius:12px;margin-bottom:30px;">
                    <h2 style="color:#fff;margin-top:0;">Hi ${professorName}!</h2>
                    <p style="color:#9ca3af;line-height:1.6;">
                        <strong style="color:#fff;">${studentName}</strong> has requested to enroll in:
                    </p>
                    <div style="background:rgba(161,96,157,0.1);border:1px solid rgba(161,96,157,0.3);border-radius:8px;padding:16px;margin:20px 0;">
                        <p style="color:#b870ad;margin:0 0 4px 0;font-weight:bold;">${className}</p>
                        <p style="color:#9ca3af;margin:0;font-size:14px;">${faculty} — ${yearName}</p>
                    </div>
                    <div style="text-align:center;margin:30px 0;">
                        <a href="${reviewUrl}"
                           style="background:linear-gradient(135deg,#a1609d,#b870ad);color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
                            Review Requests
                        </a>
                    </div>
                </div>
                <div style="text-align:center;color:#6b7280;font-size:12px;">
                    <p>Log in to NoteG to approve or reject this request.</p>
                </div>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendEnrollmentDecisionEmail = async (studentEmail, studentName, className, yearName, faculty, approved) => {
    const transporter = createTransporter();
    const link = approved
        ? `${process.env.FRONTEND_URL}/years`
        : `${process.env.FRONTEND_URL}/years`;

    const mailOptions = {
        from: `"NoteG Learning" <${process.env.EMAIL_USER}>`,
        to: studentEmail,
        subject: approved ? `Enrollment approved — ${className}` : `Enrollment request update — ${className}`,
        html: `
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#1a1a2e;padding:40px;border-radius:16px;">
                <div style="text-align:center;margin-bottom:30px;">
                    <h1 style="color:${approved ? '#34d399' : '#f87171'};margin:0;">
                        ${approved ? '✓ Enrollment Approved' : '✗ Enrollment Not Approved'}
                    </h1>
                </div>
                <div style="background:#232a36;padding:30px;border-radius:12px;margin-bottom:30px;">
                    <h2 style="color:#fff;margin-top:0;">Hi ${studentName}!</h2>
                    ${approved
                        ? `<p style="color:#9ca3af;line-height:1.6;">
                                Your enrollment request for <strong style="color:#fff;">${className}</strong>
                                (${faculty} — ${yearName}) has been <strong style="color:#34d399;">approved</strong>.
                                You now have access to all courses in this class.
                           </p>`
                        : `<p style="color:#9ca3af;line-height:1.6;">
                                Your enrollment request for <strong style="color:#fff;">${className}</strong>
                                (${faculty} — ${yearName}) was not approved at this time.
                                Please contact your professor for more information.
                           </p>`
                    }
                    <div style="text-align:center;margin:30px 0;">
                        <a href="${link}"
                           style="background:linear-gradient(135deg,#a1609d,#b870ad);color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
                            Go to Curriculum
                        </a>
                    </div>
                </div>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendPlagiarismAlertEmail,
    sendEnrollmentRequestEmail,
    sendEnrollmentDecisionEmail,
};
