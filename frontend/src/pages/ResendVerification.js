import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';

const ResendVerification = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setError('');

        try {
            await authService.resendVerification(email);
            setStatus('success');
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.error || 'Failed to send verification email');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="surface-card p-8 rounded-2xl glow-sm">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#fef483]/20 flex items-center justify-center">
                            <span className="text-4xl">✉️</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Resend Verification Email</h2>
                        <p className="text-gray-400">
                            Enter your email to receive a new verification link.
                        </p>
                    </div>

                    {status === 'success' ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <span className="text-3xl">✓</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-green-400">Email Sent!</h3>
                            <p className="text-gray-400 mb-6">
                                If an unverified account exists with <span className="text-white">{email}</span>, 
                                you'll receive a verification link shortly.
                            </p>
                            <Link 
                                to="/login" 
                                className="block w-full btn-primary py-3 text-center no-underline"
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
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
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="w-full"
                                        disabled={status === 'loading'}
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
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send Verification Email'
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

export default ResendVerification;
