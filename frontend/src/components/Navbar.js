import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4" style={{ background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(20px)' }}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link to="/student" className="flex items-center gap-2 no-underline">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center gradient-bg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-white">CodeCraft</span>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-6">
                    {user ? (
                        <>
                            <Link to="/courses" className="text-gray-300 hover:text-cyan-400 transition-colors no-underline">
                                Courses
                            </Link>
                            <Link to="/my-courses" className="text-gray-300 hover:text-cyan-400 transition-colors no-underline">
                                My Courses
                            </Link>
                            <span className="text-gray-400">
                                Welcome, <span className="text-cyan-400">{user.username}</span>
                            </span>
                            <button 
                                onClick={logout}
                                className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-gray-300 hover:text-cyan-400 transition-colors no-underline">
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
