const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getProfile, 
    verifyEmail, 
    resendVerificationEmail, 
    forgotPassword, 
    resetPassword,
    googleAuth,
    completeGoogleSignup,
    checkUsername
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Basic auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);

// Email verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.post('/google', googleAuth);
router.post('/google/complete', completeGoogleSignup);

// Username check
router.get('/check-username', checkUsername);

module.exports = router;
