const express = require('express');
const router = express.Router();
const {
    register,
    login,
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
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Basic auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);

// Profile update routes
router.post('/avatar', authMiddleware, uploadAvatar);
router.put('/profile', authMiddleware, updateProfile);

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

// Delete account
router.delete('/delete-account', authMiddleware, deleteAccount);

module.exports = router;
