import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showResendVerification, setShowResendVerification] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const { login, googleLogin, user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate(user.role === 'professor' ? '/professor' : '/student', { replace: true });
        }
    }, [user, navigate]);

    // Initialize Google Sign-In
    useEffect(() => {
        const initGoogleSignIn = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse
                });
                window.google.accounts.id.renderButton(
                    document.getElementById('google-signin-btn'),
                    { 
                        theme: 'filled_black', 
                        size: 'large', 
                        width: '100%',
                        text: 'continue_with'
                    }
                );
            }
        };

        // Load Google Identity Services script if not already loaded
        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initGoogleSignIn;
            document.body.appendChild(script);
        } else {
            initGoogleSignIn();
        }
    }, []);

    const handleGoogleResponse = async (response) => {
        try {
            setError('');
            const result = await googleLogin(response.credential);
            
            // Check if user needs to choose username
            if (result.data.needsUsername) {
                // Store temp token and redirect to username selection
                const params = new URLSearchParams({
                    token: result.data.tempToken,
                    email: result.data.email,
                    name: result.data.name || ''
                });
                navigate(`/choose-username?${params.toString()}`);
            } else {
                navigate('/student');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Google sign-in failed');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowResendVerification(false);

        try {
            await login({ email, password });
            navigate('/student');
        } catch (err) {
            const errorData = err.response?.data;
            setError(errorData?.error || 'Login failed');
            
            // Check if email needs verification
            if (errorData?.emailNotVerified) {
                setShowResendVerification(true);
                setUnverifiedEmail(errorData.email);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="surface-card p-8 rounded-2xl glow-sm">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <img src="/logo.png" alt="Note G" className="w-32 h-32 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
                        <p className="text-gray-400">Sign in to continue your learning journey</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="error-message mb-6">
                            {error}
                            {showResendVerification && (
                                <div className="mt-2">
                                    <Link 
                                        to={`/verification-pending?email=${encodeURIComponent(unverifiedEmail)}`}
                                        className="text-[#fef483] hover:text-[#fff9c4] font-medium text-sm"
                                    >
                                        Resend verification email →
                                    </Link>
                                </div>
                            )}
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
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Password
                                </label>
                                <Link 
                                    to="/forgot-password" 
                                    className="text-sm text-[#fef483] hover:text-[#fff9c4]"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <PasswordInput
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="w-full btn-primary py-3 text-lg font-semibold"
                        >
                            Sign In
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[#232a36] text-gray-400">or continue with</span>
                        </div>
                    </div>

                    {/* Google Sign-In Button */}
                    <div id="google-signin-btn" className="flex justify-center mb-6"></div>

                    {/* Register Link */}
                    <p className="text-center text-gray-400">
                        Don't have an account?{' '}
                        <Link to="/get-started" className="text-[#fef483] hover:text-[#fff9c4] font-medium">
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
