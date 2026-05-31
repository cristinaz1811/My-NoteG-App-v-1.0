import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PasswordInput, { PasswordStrengthBar } from '../components/PasswordInput';

const Register = () => {
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role') || 'student';
    
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showLoginLink, setShowLoginLink] = useState(false);
    const { register, googleLogin } = useContext(AuthContext);
    const navigate = useNavigate();

    const isProfessor = role === 'professor';

    // Initialize Google Sign-In
    useEffect(() => {
        const initGoogleSignIn = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse
                });
                window.google.accounts.id.renderButton(
                    document.getElementById('google-signup-btn'),
                    { 
                        theme: 'filled_black', 
                        size: 'large', 
                        width: '100%',
                        text: 'signup_with'
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
    }, [role]);

    const handleGoogleResponse = async (response) => {
        try {
            setError('');
            const result = await googleLogin(response.credential, role, 'signup');
            
            // Check if user needs to choose username
            if (result.data.needsUsername) {
                // Store temp token and redirect to username selection
                const params = new URLSearchParams({
                    token: result.data.tempToken,
                    email: result.data.email,
                    name: result.data.name || '',
                    role: role
                });
                navigate(`/choose-username?${params.toString()}`);
            } else {
                navigate(isProfessor ? '/professor' : '/student');
            }
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData?.existingAccount) {
                setError('An account with this email already exists. Please log in instead.');
                setShowLoginLink(true);
            } else {
                setError(errorData?.error || 'Google sign-up failed');
                setShowLoginLink(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowLoginLink(false);

        try {
            const response = await register({ username, email, password, role });
            
            // Check if email verification is required
            if (response.data.emailVerificationRequired) {
                navigate(`/verification-pending?email=${encodeURIComponent(email)}`);
            } else {
                navigate(isProfessor ? '/professor' : '/student');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
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
                        <h2 className="text-2xl font-bold mb-2">
                            {isProfessor ? 'Create Professor Account' : 'Create Your Account'}
                        </h2>
                        <p className="text-gray-400">
                            {isProfessor ? 'Start creating courses today' : 'Start your coding journey today'}
                        </p>
                        {/* Role Badge */}
                        <div className="mt-4">
                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                                isProfessor 
                                    ? 'bg-[#a1609d]/20 text-[#a1609d]' 
                                    : 'bg-[#fef483]/20 text-[#fef483]'
                            }`}>
                                    <span>{isProfessor ? 'Professor' : 'Student'}</span>
                            </span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="error-message mb-6">
                            {error}
                            {showLoginLink && (
                                <div className="mt-2">
                                    <Link 
                                        to="/login" 
                                        className="text-[#fef483] hover:text-[#fff9c4] font-medium text-sm"
                                    >
                                        Go to Login →
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="johndoe"
                                required
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@university.edu"
                                required
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use your academic/university email address</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <PasswordInput
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <PasswordStrengthBar password={password} />
                        </div>

                        <button 
                            type="submit" 
                            className={`w-full py-3 text-lg font-semibold rounded-xl transition-all ${
                                isProfessor 
                                    ? 'bg-[#a1609d] hover:bg-[#b870ad] text-white' 
                                    : 'btn-primary'
                            }`}
                        >
                            {isProfessor ? 'Create Professor Account' : 'Create Account'}
                        </button>
                    </form>

                    {/* Features */}
                    <div className="mt-8 space-y-3">
                        {isProfessor ? (
                            <>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="text-green-400">Included</span>
                                    <span>Create unlimited courses</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="text-green-400">Included</span>
                                    <span>Design exercises with custom test cases</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="text-green-400">Included</span>
                                    <span>Track student progress in real-time</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="text-green-400">Included</span>
                                    <span>Free access to all beginner courses</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="text-green-400">Included</span>
                                    <span>Track your progress and earn certificates</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="text-green-400">Included</span>
                                    <span>Join our community of developers</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[#232a36] text-gray-400">or continue with</span>
                        </div>
                    </div>

                    {/* Google Sign-Up Button */}
                    <div id="google-signup-btn" className="flex justify-center mb-6"></div>

                    {/* Login Link */}
                    <p className="text-center text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#fef483] hover:text-[#fff9c4] font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
