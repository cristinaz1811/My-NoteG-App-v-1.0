const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { enqueueEmail } = require('../utils/queueService');
const { blacklistToken, DISTRIBUTED_MODE } = require('../utils/redisClient');
const swot = require('swot-node');

// Validate that an email is from an academic institution
const validateAcademicEmail = async (email) => {
    // Skip check if disabled via env variable
    if (process.env.REQUIRE_ACADEMIC_EMAIL === 'false') return true;
    return await swot.isAcademic(email);
};

// Generate a random token
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const register = async (req, res) => {
    try {
        const { username, email, password, role = 'student' } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate role
        const validRoles = ['student', 'professor'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Validate academic email for new registrations
        const isAcademic = await validateAcademicEmail(email);
        if (!isAcademic) {
            return res.status(400).json({ error: 'Only academic email addresses are allowed. Please use your university email to register.' });
        }

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Generate verification token
        const verificationToken = generateToken();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user with role and verification token
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, role, email_verified, verification_token, verification_token_expires) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id, username, email, role, email_verified`,
            [username, email, passwordHash, role, false, verificationToken, verificationExpires]
        );

        const user = result.rows[0];

        // Queue verification email (non-blocking)
        enqueueEmail({ type: 'sendVerificationEmail', email, username, verificationToken }).catch(err =>
            console.error('Failed to queue verification email:', err.message)
        );

        // Generate token (but user needs to verify email before full access)
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully. Please check your email to verify your account.',
            user,
            token,
            emailVerificationRequired: true
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if user has a password (Google OAuth users might not)
        if (!user.password_hash) {
            return res.status(401).json({ error: 'Please use Google to sign in' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if email is verified
        if (!user.email_verified) {
            return res.status(403).json({ 
                error: 'Please verify your email before logging in',
                emailNotVerified: true,
                email: user.email
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar_url: user.avatar_url || null,
            },
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, username, email, role, created_at, email_verified, avatar_url FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        const { avatar } = req.body;
        if (!avatar || !avatar.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid image data' });
        }

        // Rough size guard: base64 of a 256×256 JPEG is well under 100 KB
        if (Buffer.byteLength(avatar, 'utf8') > 200 * 1024) {
            return res.status(400).json({ error: 'Image too large (max ~150 KB after compression)' });
        }

        await db.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatar, req.user.id]);

        res.json({ avatarUrl: avatar });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const updates = [];
        const values = [];
        let idx = 1;

        if (username) {
            if (username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9_]+$/.test(username)) {
                return res.status(400).json({ error: 'Username must be 3–30 characters and only contain letters, numbers, and underscores' });
            }
            const taken = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
            if (taken.rows.length > 0) return res.status(409).json({ error: 'Username already taken' });
            updates.push(`username = $${idx++}`);
            values.push(username);
        }

        if (currentPassword && newPassword) {
            if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
            const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
            const user = userResult.rows[0];
            if (!user.password_hash) return res.status(400).json({ error: 'Password change is not available for Google accounts' });
            const valid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
            const hash = await bcrypt.hash(newPassword, 10);
            updates.push(`password_hash = $${idx++}`);
            values.push(hash);
        }

        if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

        updates.push('updated_at = NOW()');
        values.push(userId);

        const result = await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, role, avatar_url`,
            values
        );

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Verify email with token
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        // Find user with this verification token
        const result = await db.query(
            'SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        const user = result.rows[0];

        // Update user as verified
        await db.query(
            'UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
            [user.id]
        );

        // Generate auth token
        const authToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Email verified successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token: authToken
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            // Don't reveal if email exists
            return res.json({ message: 'If an account exists, a verification email will be sent' });
        }

        const user = result.rows[0];

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        // Generate new verification token
        const verificationToken = generateToken();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.query(
            'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
            [verificationToken, verificationExpires, user.id]
        );

        enqueueEmail({ type: 'sendVerificationEmail', email, username: user.username, verificationToken }).catch(err =>
            console.error('Failed to queue verification email:', err.message)
        );

        res.json({ message: 'Verification email sent' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Request password reset
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        // Always return success to prevent email enumeration
        if (result.rows.length === 0) {
            return res.json({ message: 'If an account exists, a password reset email will be sent' });
        }

        const user = result.rows[0];

        // Don't allow password reset for Google OAuth users without passwords
        if (!user.password_hash && user.google_id) {
            return res.json({ message: 'If an account exists, a password reset email will be sent' });
        }

        // Generate password reset token
        const resetToken = generateToken();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.query(
            'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
            [resetToken, resetExpires, user.id]
        );

        enqueueEmail({ type: 'sendPasswordResetEmail', email, username: user.username, resetToken }).catch(err =>
            console.error('Failed to queue password reset email:', err.message)
        );

        res.json({ message: 'If an account exists, a password reset email will be sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Reset password with token
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Find user with this reset token
        const result = await db.query(
            'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const user = result.rows[0];

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update password and clear reset token
        await db.query(
            'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
            [passwordHash, user.id]
        );

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Google OAuth login/register
const googleAuth = async (req, res) => {
    try {
        const { credential, role = 'student', mode } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        // Verify the Google token
        // In production, verify with Google's API: https://oauth2.googleapis.com/tokeninfo?id_token=<token>
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        
        if (!response.ok) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        const googleUser = await response.json();
        
        // Verify the audience (client ID)
        if (googleUser.aud !== process.env.GOOGLE_CLIENT_ID) {
            return res.status(401).json({ error: 'Invalid token audience' });
        }

        const { email, name, sub: googleId } = googleUser;

        // Check if user exists
        let result = await db.query(
            'SELECT * FROM users WHERE google_id = $1 OR email = $2',
            [googleId, email]
        );

        let user;

        if (result.rows.length === 0) {
            // New user - validate academic email
            const isAcademic = await validateAcademicEmail(email);
            if (!isAcademic) {
                return res.status(400).json({ error: 'Only academic email addresses are allowed. Please use a Google account linked to your university email.' });
            }

            // New user - they need to choose a username
            
            // Generate a temporary token with Google info for username selection
            const tempToken = jwt.sign(
                { googleId, email, name, role, isTemp: true },
                process.env.JWT_SECRET,
                { expiresIn: '15m' } // Short expiry for security
            );

            return res.json({
                needsUsername: true,
                tempToken,
                suggestedUsername: name.replace(/\s+/g, '_').toLowerCase(),
                email
            });
        } else {
            user = result.rows[0];

            // If this is a signup attempt and the user already exists, don't auto-login
            if (mode === 'signup') {
                return res.status(409).json({ 
                    error: 'An account with this email already exists. Please log in instead.',
                    existingAccount: true
                });
            }
            
            // If user exists but wasn't using Google, link the accounts
            if (!user.google_id) {
                await db.query(
                    'UPDATE users SET google_id = $1, email_verified = true WHERE id = $2',
                    [googleId, user.id]
                );
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Google authentication successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Complete Google signup with chosen username
const completeGoogleSignup = async (req, res) => {
    try {
        const { tempToken, username } = req.body;

        if (!tempToken || !username) {
            return res.status(400).json({ error: 'Token and username are required' });
        }

        // Validate username format
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be 3-30 characters' });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        }

        // Verify temp token
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Invalid or expired token. Please sign in with Google again.' });
        }

        if (!decoded.isTemp) {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        const { googleId, email, role } = decoded;

        // Check if username is taken
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Username is already taken' });
        }

        // Check if user was already created (double-submit protection)
        const existingGoogleUser = await db.query(
            'SELECT * FROM users WHERE google_id = $1 OR email = $2',
            [googleId, email]
        );

        if (existingGoogleUser.rows.length > 0) {
            // User already exists, just log them in
            const user = existingGoogleUser.rows[0];
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            return res.json({
                message: 'Login successful',
                user: { id: user.id, username: user.username, email: user.email, role: user.role },
                token
            });
        }

        // Create the user with chosen username
        const result = await db.query(
            `INSERT INTO users (username, email, google_id, role, email_verified) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, username, email, role, email_verified`,
            [username, email, googleId, role, true]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Account created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Complete Google signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete user account and all associated data
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        // submissions, user_progress, ai_hints, ai_complexity_analysis, help_requests cascade from users
        await db.query('DELETE FROM enrollments WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM course_time_sessions WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Check if username is available
const checkUsername = async (req, res) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const result = await db.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        res.json({ available: result.rows.length === 0 });
    } catch (error) {
        console.error('Check username error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token && DISTRIBUTED_MODE) {
            // Decode to get expiry without re-verifying (already verified by authMiddleware)
            const decoded = jwt.decode(token);
            if (decoded?.exp) {
                const ttl = decoded.exp - Math.floor(Date.now() / 1000);
                if (ttl > 0) await blacklistToken(token, ttl);
            }
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile,
    uploadAvatar,
    updateProfile,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    googleAuth,
    completeGoogleSignup,
    checkUsername,
    deleteAccount
};
