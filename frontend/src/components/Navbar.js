import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    
    // Check if on auth pages where logo should not be clickable
    const isAuthPage = ['/login', '/register', '/get-started'].includes(location.pathname);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Logo content shared between clickable and non-clickable versions
    const LogoContent = () => (
        <>
            <div className="absolute -inset-2 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(254, 244, 131, 0.3), rgba(161, 96, 157, 0.15), transparent 70%)' }}></div>
            <img src="/logo.png" alt="Note G" className="w-32 h-32 relative z-10" style={{ filter: 'drop-shadow(0 0 12px rgba(254, 244, 131, 0.4))' }} />
            <span className="text-xl font-bold text-white relative z-10">Note G</span>
        </>
    );

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 border-b border-white/5" style={{ background: 'linear-gradient(to bottom, rgba(18, 22, 28, 0.6) 0%, rgba(18, 22, 28, 0.3) 70%, transparent 100%)', backdropFilter: 'blur(12px)' }}>
            {/* Decorative glow orbs */}
            <div className="absolute top-2 left-[20%] w-16 h-16 rounded-full opacity-20 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(254, 244, 131, 0.4), transparent 70%)', animationDuration: '3s' }}></div>
            <div className="absolute top-4 left-[40%] w-8 h-8 rounded-full opacity-15 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(161, 96, 157, 0.5), transparent 70%)', animationDuration: '4s' }}></div>
            <div className="absolute top-1 right-[30%] w-12 h-12 rounded-full opacity-20 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(184, 138, 181, 0.4), transparent 70%)', animationDuration: '5s' }}></div>
            <div className="absolute top-3 right-[15%] w-20 h-20 rounded-full opacity-15 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(254, 244, 131, 0.3), transparent 70%)', animationDuration: '3.5s' }}></div>
            <div className="absolute top-0 left-[60%] w-6 h-6 rounded-full opacity-25 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(161, 96, 157, 0.4), transparent 70%)', animationDuration: '2.5s' }}></div>
            <div className="absolute top-5 right-[50%] w-10 h-10 rounded-full opacity-15 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(254, 244, 131, 0.35), transparent 70%)', animationDuration: '4.5s' }}></div>
            
            <div className="max-w-7xl mx-auto flex items-center justify-between h-20 relative">
                {/* Logo - non-clickable on auth pages */}
                {isAuthPage ? (
                    <div className="flex items-center gap-2 relative -my-4">
                        <LogoContent />
                    </div>
                ) : (
                    <Link to="/student" className="flex items-center gap-2 no-underline relative -my-4">
                        <LogoContent />
                    </Link>
                )}

                {/* Navigation Links */}
                <div className="flex items-center gap-6">
                    {user ? (
                        <>
                            {user.role === 'professor' || user.role === 'admin' ? (
                                // Professor Navigation
                                <>
                                    <Link to="/professor" className="text-gray-300 hover:text-[#a1609d] transition-colors no-underline">
                                        Dashboard
                                    </Link>
                                    <Link to="/professor/plagiarism" className="text-gray-300 hover:text-[#a1609d] transition-colors no-underline">
                                        🔍 Plagiarism
                                    </Link>
                                    <Link to="/courses" className="text-gray-300 hover:text-[#a1609d] transition-colors no-underline">
                                        All Courses
                                    </Link>
                                </>
                            ) : (
                                // Student Navigation
                                <>
                                    <Link to="/courses" className="text-gray-300 hover:text-[#fef483] transition-colors no-underline">
                                        Courses
                                    </Link>
                                    <Link to="/my-courses" className="text-gray-300 hover:text-[#fef483] transition-colors no-underline">
                                        My Courses
                                    </Link>
                                </>
                            )}
                            <span className="text-gray-400">
                                Welcome, <span style={{ color: user.role === 'professor' ? '#a1609d' : '#fef483' }}>{user.username}</span>
                                {user.role === 'professor' && <span className="ml-1 text-xs text-[#a1609d]">(Prof)</span>}
                            </span>
                            {/* Profile Dropdown */}
                            <div className="relative" ref={profileRef}>
                                <button 
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 cursor-pointer transition-all hover:scale-105"
                                    style={{ 
                                        background: user.role === 'professor' 
                                            ? 'linear-gradient(135deg, #a1609d, #b88ab5)' 
                                            : 'linear-gradient(135deg, #fef483, #a1609d)',
                                        borderColor: user.role === 'professor' ? '#a1609d' : '#fef483'
                                    }}
                                >
                                    {user.username?.charAt(0).toUpperCase()}
                                </button>
                                {profileOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50"
                                         style={{ background: 'rgba(30, 35, 44, 0.98)', backdropFilter: 'blur(20px)' }}>
                                        <div className="px-4 py-3 border-b border-white/10">
                                            <p className="text-sm font-medium text-white truncate">{user.username}</p>
                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-2"
                                            >
                                                <span>👤</span> Profile
                                            </button>
                                            <button
                                                onClick={() => { setProfileOpen(false); handleLogout(); }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-2"
                                            >
                                                <span>🚪</span> Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-gray-300 hover:text-[#fef483] transition-colors no-underline">
                                Sign In
                            </Link>
                            <Link 
                                to="/get-started" 
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
