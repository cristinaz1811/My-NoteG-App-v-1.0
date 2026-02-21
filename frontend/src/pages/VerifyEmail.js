import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [error, setError] = useState('');
    const { setUserAfterVerification } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            verifyEmail();
        } else {
            setStatus('error');
            setError('No verification token provided');
        }
    }, [token]);

    const verifyEmail = async () => {
        try {
            const response = await authService.verifyEmail(token);
            const { user, token: authToken } = response.data;
            
            // Set user in context and localStorage
            setUserAfterVerification(user, authToken);
            
            setStatus('success');
            
            // Redirect after 2 seconds
            setTimeout(() => {
                navigate(user.role === 'professor' ? '/professor' : '/student');
            }, 2000);
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.error || 'Verification failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="surface-card p-8 rounded-2xl glow-sm text-center">
                    {status === 'verifying' && (
                        <>
                            <div className="w-16 h-16 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                            <h2 className="text-2xl font-bold mb-2">Verifying Your Email</h2>
                            <p className="text-gray-400">Please wait while we confirm your email address...</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <span className="text-4xl">✓</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-green-400">Email Verified!</h2>
                            <p className="text-gray-400 mb-6">
                                Your email has been verified successfully. Redirecting you to the dashboard...
                            </p>
                            <div className="w-8 h-8 border-2 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <span className="text-4xl">✗</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-red-400">Verification Failed</h2>
                            <p className="text-gray-400 mb-6">{error}</p>
                            <div className="space-y-4">
                                <Link 
                                    to="/login" 
                                    className="block w-full btn-primary py-3 text-center no-underline"
                                >
                                    Go to Login
                                </Link>
                                <p className="text-sm text-gray-500">
                                    Need a new verification link?{' '}
                                    <Link to="/resend-verification" className="text-[#fef483] hover:text-[#fff9c4]">
                                        Request one here
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
