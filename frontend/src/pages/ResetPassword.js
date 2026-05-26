import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import PasswordInput, { PasswordStrengthBar } from '../components/PasswordInput';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!token) {
            setError('Invalid reset link. Please request a new one.');
            return;
        }

        setStatus('loading');

        try {
            await authService.resetPassword(token, password);
            setStatus('success');
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.error || 'Failed to reset password');
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="surface-card p-8 rounded-2xl glow-sm text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-red-400">Invalid Link</h2>
                        <p className="text-gray-400 mb-6">
                            This password reset link is invalid or has expired.
                        </p>
                        <Link 
                            to="/forgot-password" 
                            className="block w-full btn-primary py-3 text-center no-underline"
                        >
                            Request New Link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="surface-card p-8 rounded-2xl glow-sm">
                    {status === 'success' ? (
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <span className="text-4xl">✓</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-green-400">Password Reset!</h2>
                            <p className="text-gray-400 mb-6">
                                Your password has been reset successfully. Redirecting to login...
                            </p>
                            <div className="w-8 h-8 border-2 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#a1609d]/20 flex items-center justify-center">
                                    <span className="text-4xl">🔐</span>
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Reset Your Password</h2>
                                <p className="text-gray-400">Enter your new password below.</p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="error-message mb-6">
                                    {error}
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        New Password
                                    </label>
                                    <PasswordInput
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={status === 'loading'}
                                        minLength={6}
                                    />
                                    <PasswordStrengthBar password={password} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Confirm Password
                                    </label>
                                    <PasswordInput
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={status === 'loading'}
                                        minLength={6}
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50"
                                    disabled={status === 'loading'}
                                >
                                    {status === 'loading' ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Resetting...
                                        </span>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </form>

                            {/* Back to Login */}
                            <div className="mt-8 text-center">
                                <Link to="/login" className="text-[#fef483] hover:text-[#fff9c4] font-medium">
                                    ← Back to Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
