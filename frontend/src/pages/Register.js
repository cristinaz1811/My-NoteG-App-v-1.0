import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await register({ username, email, password });
            navigate('/student');
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
                        <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
                        <p className="text-gray-400">Start your coding journey today</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="error-message mb-6">
                            {error}
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
                                placeholder="you@example.com"
                                required
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full"
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="w-full btn-primary py-3 text-lg font-semibold"
                        >
                            Create Account
                        </button>
                    </form>

                    {/* Features */}
                    <div className="mt-8 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="text-green-400">✓</span>
                            <span>Free access to all beginner courses</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="text-green-400">✓</span>
                            <span>Track your progress and earn certificates</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="text-green-400">✓</span>
                            <span>Join our community of developers</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[#232a36] text-gray-400">or</span>
                        </div>
                    </div>

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
