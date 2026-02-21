import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ChooseUsername = () => {
    const [searchParams] = useSearchParams();
    const tempToken = searchParams.get('token');
    const suggestedUsername = searchParams.get('suggested') || '';
    const email = searchParams.get('email') || '';
    
    const [username, setUsername] = useState(suggestedUsername);
    const [isAvailable, setIsAvailable] = useState(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    const { setUserAfterVerification } = useContext(AuthContext);
    const navigate = useNavigate();

    // Check username availability with debounce
    useEffect(() => {
        if (username.length < 3) {
            setIsAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setChecking(true);
            try {
                const response = await authService.checkUsername(username);
                setIsAvailable(response.data.available);
            } catch (err) {
                console.error('Error checking username:', err);
            } finally {
                setChecking(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!tempToken) {
            setError('Session expired. Please sign in with Google again.');
            return;
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('Username can only contain letters, numbers, and underscores');
            return;
        }

        if (!isAvailable) {
            setError('This username is not available');
            return;
        }

        setSubmitting(true);

        try {
            const response = await authService.completeGoogleSignup(tempToken, username);
            const { user, token } = response.data;
            
            // Set user in context
            setUserAfterVerification(user, token);
            
            // Redirect based on role
            navigate(user.role === 'professor' ? '/professor' : '/student');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create account');
            setSubmitting(false);
        }
    };

    if (!tempToken) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="surface-card p-8 rounded-2xl glow-sm text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-red-400">Session Expired</h2>
                        <p className="text-gray-400 mb-6">
                            Please sign in with Google again to continue.
                        </p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full btn-primary py-3"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="surface-card p-8 rounded-2xl glow-sm">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#a1609d]/20 flex items-center justify-center">
                            <span className="text-4xl">👤</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Choose Your Username</h2>
                        <p className="text-gray-400">
                            Pick a unique username for your account
                        </p>
                        {email && (
                            <p className="text-sm text-gray-500 mt-2">
                                Signing up as <span className="text-[#fef483]">{email}</span>
                            </p>
                        )}
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
                                Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    placeholder="your_username"
                                    required
                                    className="w-full pr-10"
                                    disabled={submitting}
                                    maxLength={30}
                                    minLength={3}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {checking && (
                                        <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                                    )}
                                    {!checking && isAvailable === true && username.length >= 3 && (
                                        <span className="text-green-400 text-lg">✓</span>
                                    )}
                                    {!checking && isAvailable === false && (
                                        <span className="text-red-400 text-lg">✗</span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 text-sm">
                                {username.length > 0 && username.length < 3 && (
                                    <p className="text-gray-500">Minimum 3 characters</p>
                                )}
                                {!checking && isAvailable === true && username.length >= 3 && (
                                    <p className="text-green-400">Username is available!</p>
                                )}
                                {!checking && isAvailable === false && (
                                    <p className="text-red-400">Username is already taken</p>
                                )}
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50"
                            disabled={submitting || !isAvailable || username.length < 3}
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Creating Account...
                                </span>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Tips */}
                    <div className="mt-6 p-4 rounded-xl bg-white/5">
                        <p className="text-sm text-gray-400">
                            <span className="text-[#fef483]">💡 Tips:</span>
                        </p>
                        <ul className="text-sm text-gray-500 mt-2 space-y-1 ml-4 list-disc">
                            <li>Use letters, numbers, and underscores</li>
                            <li>3-30 characters long</li>
                            <li>This will be your display name</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChooseUsername;
