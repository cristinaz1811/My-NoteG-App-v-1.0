import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const profileRef = useRef(null);

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';
    const accent = isProfessor ? '#a1609d' : '#fef483';

    // Check if on auth pages where logo should not be clickable
    const isAuthPage = ['/login', '/register', '/get-started'].includes(location.pathname);

    // Close the profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close menus on navigation
    useEffect(() => {
        setProfileOpen(false);
        setMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navLinks = !user
        ? []
        : isProfessor
          ? [
                { to: '/professor', label: 'Dashboard' },
                { to: '/professor/plagiarism', label: 'Plagiarism' },
                { to: '/courses', label: 'All Courses' },
                { to: '/calendar', label: 'Calendar' },
            ]
          : [
                { to: '/courses', label: 'Courses' },
                { to: '/my-courses', label: 'My Courses' },
                { to: '/my-analytics', label: 'Analytics' },
                { to: '/calendar', label: 'Calendar' },
            ];

    // Logo content shared between clickable and non-clickable versions
    const LogoContent = () => (
        <>
            <div
                aria-hidden="true"
                className="absolute -inset-2 rounded-full opacity-40"
                style={{
                    background:
                        'radial-gradient(circle, rgba(254, 244, 131, 0.3), rgba(161, 96, 157, 0.15), transparent 70%)',
                }}
            ></div>
            <img
                src="/logo.png"
                alt="Note G"
                className="w-32 h-32 relative z-10"
                style={{ filter: 'drop-shadow(0 0 12px rgba(254, 244, 131, 0.4))' }}
            />
            <span className="text-xl font-bold text-white relative z-10">Note G</span>
        </>
    );

    const desktopLinkClass =
        'text-gray-300 transition-colors no-underline rounded px-1 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483] ' +
        (isProfessor ? 'hover:text-[#a1609d]' : 'hover:text-[#fef483]');

    return (
        <nav
            aria-label="Main navigation"
            className="fixed top-0 left-0 right-0 z-50 px-6 border-b border-white/5"
            style={{
                background: `linear-gradient(to bottom, var(--navbar-bg) 0%, var(--navbar-bg-end) 70%, transparent 100%)`,
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Decorative glow orbs */}
            <div aria-hidden="true">
                <div
                    className="absolute top-2 left-[20%] w-16 h-16 rounded-full opacity-20 animate-pulse"
                    style={{
                        background:
                            'radial-gradient(circle, rgba(254, 244, 131, 0.4), transparent 70%)',
                        animationDuration: '3s',
                    }}
                ></div>
                <div
                    className="absolute top-4 left-[40%] w-8 h-8 rounded-full opacity-15 animate-pulse"
                    style={{
                        background:
                            'radial-gradient(circle, rgba(161, 96, 157, 0.5), transparent 70%)',
                        animationDuration: '4s',
                    }}
                ></div>
                <div
                    className="absolute top-1 right-[30%] w-12 h-12 rounded-full opacity-20 animate-pulse"
                    style={{
                        background:
                            'radial-gradient(circle, rgba(184, 138, 181, 0.4), transparent 70%)',
                        animationDuration: '5s',
                    }}
                ></div>
                <div
                    className="absolute top-3 right-[15%] w-20 h-20 rounded-full opacity-15 animate-pulse"
                    style={{
                        background:
                            'radial-gradient(circle, rgba(254, 244, 131, 0.3), transparent 70%)',
                        animationDuration: '3.5s',
                    }}
                ></div>
                <div
                    className="absolute top-0 left-[60%] w-6 h-6 rounded-full opacity-25 animate-pulse"
                    style={{
                        background:
                            'radial-gradient(circle, rgba(161, 96, 157, 0.4), transparent 70%)',
                        animationDuration: '2.5s',
                    }}
                ></div>
                <div
                    className="absolute top-5 right-[50%] w-10 h-10 rounded-full opacity-15 animate-pulse"
                    style={{
                        background:
                            'radial-gradient(circle, rgba(254, 244, 131, 0.35), transparent 70%)',
                        animationDuration: '4.5s',
                    }}
                ></div>
            </div>

            <div className="max-w-7xl mx-auto flex items-center justify-between h-20 relative">
                {/* Logo - non-clickable on auth pages */}
                {isAuthPage ? (
                    <div className="flex items-center gap-2 relative -my-4">
                        <LogoContent />
                    </div>
                ) : (
                    <Link
                        to="/student"
                        aria-label="Note G home"
                        className="flex items-center gap-2 no-underline relative -my-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                    >
                        <LogoContent />
                    </Link>
                )}

                {/* Desktop navigation */}
                <div className="hidden md:flex items-center gap-6">
                    {user ? (
                        <>
                            {navLinks.map(({ to, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    aria-current={
                                        location.pathname === to ? 'page' : undefined
                                    }
                                    className={desktopLinkClass}
                                    style={{
                                        color:
                                            location.pathname === to ? accent : undefined,
                                    }}
                                >
                                    {label}
                                </Link>
                            ))}
                            <span className="text-gray-400">
                                Welcome,{' '}
                                <span style={{ color: accent }}>{user.username}</span>
                                {isProfessor && (
                                    <span className="ml-1 text-xs text-[#a1609d]">
                                        (Prof)
                                    </span>
                                )}
                            </span>
                            <ThemeToggle />
                            <NotificationBell />
                            {/* Profile Dropdown */}
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    aria-label="Account menu"
                                    aria-haspopup="menu"
                                    aria-expanded={profileOpen}
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 cursor-pointer transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                                    style={{
                                        background: isProfessor
                                            ? 'linear-gradient(135deg, #a1609d, #b88ab5)'
                                            : 'linear-gradient(135deg, #fef483, #a1609d)',
                                        borderColor: accent,
                                    }}
                                >
                                    {user.username?.charAt(0).toUpperCase()}
                                </button>
                                {profileOpen && (
                                    <div
                                        role="menu"
                                        aria-label="Account"
                                        className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50"
                                        style={{
                                            background: 'var(--dropdown-bg)',
                                            backdropFilter: 'blur(20px)',
                                        }}
                                    >
                                        <div
                                            className="px-4 py-3 border-b"
                                            style={{ borderColor: 'var(--border-color)' }}
                                        >
                                            <p className="text-sm font-medium text-white truncate">
                                                {user.username}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                role="menuitem"
                                                onClick={() => {
                                                    setProfileOpen(false);
                                                    navigate('/profile');
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer focus-visible:outline-none focus-visible:bg-white/10"
                                            >
                                                Profile
                                            </button>
                                            <button
                                                role="menuitem"
                                                onClick={() => {
                                                    setProfileOpen(false);
                                                    handleLogout();
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer focus-visible:outline-none focus-visible:bg-white/10"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <ThemeToggle />
                            <Link
                                to="/login"
                                className="text-gray-300 hover:text-[#fef483] transition-colors no-underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/get-started"
                                className="px-5 py-2 rounded-lg font-medium gradient-bg text-white no-underline hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile cluster */}
                <div className="flex md:hidden items-center gap-3">
                    <ThemeToggle />
                    {user && <NotificationBell />}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        aria-haspopup="menu"
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-menu"
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-gray-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                        >
                            {mobileOpen ? (
                                <>
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </>
                            ) : (
                                <>
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile menu panel */}
            {mobileOpen && (
                <div
                    id="mobile-menu"
                    role="menu"
                    aria-label="Mobile navigation"
                    className="md:hidden relative max-w-7xl mx-auto pb-4 flex flex-col gap-1"
                >
                    {user ? (
                        <>
                            {navLinks.map(({ to, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    role="menuitem"
                                    aria-current={
                                        location.pathname === to ? 'page' : undefined
                                    }
                                    className="px-3 py-2.5 rounded-lg text-gray-200 no-underline hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                                    style={{
                                        color:
                                            location.pathname === to ? accent : undefined,
                                    }}
                                >
                                    {label}
                                </Link>
                            ))}
                            <div
                                className="mt-2 pt-2 border-t"
                                style={{ borderColor: 'var(--border-color)' }}
                            >
                                <p className="px-3 py-1 text-xs text-gray-400">
                                    Signed in as{' '}
                                    <span style={{ color: accent }}>{user.username}</span>
                                </p>
                                <Link
                                    to="/profile"
                                    role="menuitem"
                                    className="block px-3 py-2.5 rounded-lg text-gray-200 no-underline hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                                >
                                    Profile
                                </Link>
                                <button
                                    role="menuitem"
                                    onClick={handleLogout}
                                    className="w-full text-left px-3 py-2.5 rounded-lg text-gray-200 hover:bg-white/5 border-none bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                                >
                                    Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                role="menuitem"
                                className="px-3 py-2.5 rounded-lg text-gray-200 no-underline hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/get-started"
                                role="menuitem"
                                className="px-3 py-2.5 rounded-lg gradient-bg text-white text-center no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fef483]"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
