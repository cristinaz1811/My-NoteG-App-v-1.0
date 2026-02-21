import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';

const VerificationPending = () => {
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';
    
    const [resendStatus, setResendStatus] = useState('idle'); // idle, loading, success, error

    const handleResend = async () => {
        if (!email) return;
        
        setResendStatus('loading');
        try {
            await authService.resendVerification(email);
            setResendStatus('success');
        } catch (err) {
            setResendStatus('error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="surface-card p-8 rounded-2xl glow-sm text-center">
                    {/* Icon */}
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#fef483]/20 flex items-center justify-center">
                        <span className="text-5xl">📧</span>
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
                    <p className="text-gray-400 mb-6">
                        We've sent a verification link to{' '}
                        {email ? <span className="text-white font-medium">{email}</span> : 'your email address'}.
                        Please click the link to verify your account.
                    </p>

                    {/* Tips */}
                    <div className="surface-card p-4 rounded-xl mb-6 text-left">
                        <p className="text-sm text-gray-400 mb-2">
                            <span className="text-[#fef483]">💡</span> Can't find the email?
                        </p>
                        <ul className="text-sm text-gray-500 space-y-1 ml-5">
                            <li>Check your spam or junk folder</li>
                            <li>Make sure you entered the correct email</li>
                            <li>Wait a few minutes and try again</li>
                        </ul>
                    </div>

                    {/* Resend Button */}
                    {email && (
                        <div className="mb-6">
                            {resendStatus === 'success' ? (
                                <p className="text-green-400 text-sm">
                                    ✓ Verification email resent successfully!
                                </p>
                            ) : resendStatus === 'error' ? (
                                <p className="text-red-400 text-sm">
                                    Failed to resend. Please try again.
                                </p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={resendStatus === 'loading'}
                                    className="text-[#fef483] hover:text-[#fff9c4] font-medium disabled:opacity-50"
                                >
                                    {resendStatus === 'loading' ? 'Sending...' : "Didn't receive it? Resend email"}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Back to Login */}
                    <Link 
                        to="/login" 
                        className="block w-full btn-primary py-3 text-center no-underline"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default VerificationPending;
