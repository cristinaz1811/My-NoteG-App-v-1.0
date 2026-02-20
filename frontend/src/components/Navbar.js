import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-1 border-b border-white/5" style={{ background: 'linear-gradient(to bottom, rgba(18, 22, 28, 0.6) 0%, rgba(18, 22, 28, 0.3) 70%, transparent 100%)', backdropFilter: 'blur(12px)' }}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link to="/student" className="flex items-center gap-2 no-underline">
                    <img src="/logo.png" alt="Note G" className="w-16 h-16" />
                    <span className="text-xl font-bold text-white">Note G</span>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-6">
                    {user ? (
                        <>
                            <Link to="/courses" className="text-gray-300 hover:text-[#fef483] transition-colors no-underline">
                                Courses
                            </Link>
                            <Link to="/my-courses" className="text-gray-300 hover:text-[#fef483] transition-colors no-underline">
                                My Courses
                            </Link>
                            <span className="text-gray-400">
                                Welcome, <span className="text-[#fef483]">{user.username}</span>
                            </span>
                            <button 
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-gray-300 hover:text-[#fef483] transition-colors no-underline">
                                Sign In
                            </Link>
                            <Link 
                                to="/register" 
                                className="px-5 py-2 rounded-lg font-medium gradient-bg text-white no-underline hover:opacity-90 transition-opacity"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
