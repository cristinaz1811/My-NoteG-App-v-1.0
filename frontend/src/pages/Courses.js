import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

// ── Inline SVG icons ────────────────────────────────────────────────────────

const IconBook = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
);

const IconCode = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
    </svg>
);

const IconClock = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
    </svg>
);

const IconLock = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
);

const IconKey = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
);

const IconSearch = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
);

const IconCheck = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

// ── Language config ──────────────────────────────────────────────────────────

const LANGUAGE_CONFIGS = {
    javascript: { label: 'JS',  gradient: 'from-amber-400 to-yellow-500',   textColor: '#1a1200' },
    python:     { label: 'PY',  gradient: 'from-blue-500 to-indigo-600',    textColor: '#ffffff' },
    typescript: { label: 'TS',  gradient: 'from-blue-400 to-cyan-500',      textColor: '#ffffff' },
    java:       { label: 'JV',  gradient: 'from-red-500 to-orange-600',     textColor: '#ffffff' },
    cpp:        { label: 'C++', gradient: 'from-violet-500 to-purple-700',  textColor: '#ffffff' },
    go:         { label: 'GO',  gradient: 'from-cyan-500 to-teal-600',      textColor: '#ffffff' },
    rust:       { label: 'RS',  gradient: 'from-orange-600 to-red-700',     textColor: '#ffffff' },
};

const FALLBACK_GRADIENTS = [
    'from-violet-500 to-purple-700',
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-blue-700',
    'from-rose-500 to-pink-700',
];

const getLanguageConfig = (language, index) => {
    const key = (language || '').toLowerCase();
    return LANGUAGE_CONFIGS[key] || {
        label: key.slice(0, 2).toUpperCase() || 'CD',
        gradient: FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length],
        textColor: '#ffffff',
    };
};

// ── Component ────────────────────────────────────────────────────────────────

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [langFilter, setLangFilter] = useState('all');
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [enrollCode, setEnrollCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [codeSuccess, setCodeSuccess] = useState(null);
    const [enrolling, setEnrolling] = useState(false);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoadError(null);
            const response = await courseService.getAllCourses();
            setCourses(response.data);
        } catch (error) {
            console.error('Error loading courses:', error);
            setLoadError('Something went wrong while loading courses.');
        } finally {
            setLoading(false);
        }
    };

    const handleCourseClick = (courseId) => {
        navigate(`/courses/${courseId}`);
    };

    const handleEnrollByCode = async () => {
        if (!enrollCode.trim()) {
            setCodeError('Please enter an enrollment code.');
            return;
        }
        setEnrolling(true);
        setCodeError('');
        setCodeSuccess(null);
        try {
            const response = await courseService.enrollByCode(enrollCode.trim());
            setCodeSuccess(response.data);
            setEnrollCode('');
        } catch (error) {
            if (error.response?.data?.alreadyEnrolled) {
                navigate(`/my-courses/${error.response.data.courseId}`);
                return;
            }
            setCodeError(error.response?.data?.error || 'Invalid enrollment code.');
        } finally {
            setEnrolling(false);
        }
    };

    const availableLanguages = [...new Set(
        courses.map(c => (c.language || '').toLowerCase()).filter(Boolean)
    )].sort();

    const filteredCourses = courses.filter(course => {
        const matchesDifficulty = filter === 'all' || course.difficulty === filter;
        const matchesLanguage =
            langFilter === 'all' || (course.language || '').toLowerCase() === langFilter;
        const query = search.trim().toLowerCase();
        const matchesSearch =
            !query ||
            (course.title || '').toLowerCase().includes(query) ||
            (course.description || '').toLowerCase().includes(query);
        return matchesDifficulty && matchesLanguage && matchesSearch;
    });

    const getDifficultyBadgeClass = (difficulty) => {
        switch (difficulty) {
            case 'beginner':     return 'badge-beginner';
            case 'intermediate': return 'badge-intermediate';
            case 'advanced':     return 'badge-advanced';
            default:             return 'badge-beginner';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-[#a1609d]/30 border-t-[#a1609d] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Loading courses…</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                    <h3 className="text-xl font-semibold mb-2">Couldn't load courses</h3>
                    <p className="text-gray-400 mb-6">{loadError}</p>
                    <button
                        onClick={() => { setLoading(true); loadCourses(); }}
                        className="btn-primary px-6 py-2.5"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-8 px-6 page-fade-in">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12 animate-fade-in-up">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                        Popular <span className="gradient-text">Learning Paths</span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
                        Choose your path and start building the skills employers are looking for.
                    </p>
                    {user && (
                        <button
                            onClick={() => { setShowCodeModal(true); setCodeError(''); setCodeSuccess(null); setEnrollCode(''); }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-[#a1609d] border border-[#a1609d]/30 hover:bg-[#a1609d]/10 transition-colors"
                        >
                            <IconKey />
                            Join with Enrollment Code
                        </button>
                    )}
                </div>

                {/* Enrollment Code Modal */}
                {showCodeModal && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in-up"
                        onClick={() => setShowCodeModal(false)}
                    >
                        <div
                            className="surface-card rounded-2xl p-8 max-w-md w-full animate-scale-in"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Join a Private Course</h2>
                                <button
                                    onClick={() => setShowCodeModal(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xl leading-none"
                                >
                                    ×
                                </button>
                            </div>
                            <p className="text-gray-400 text-sm mb-6">
                                Enter the enrollment code provided by your professor to join a private course.
                            </p>

                            {codeSuccess ? (
                                <div className="text-center animate-scale-in">
                                    <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4 text-green-400">
                                        <IconCheck />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2 text-green-400">Successfully enrolled!</h3>
                                    <p className="text-gray-400 mb-1">{codeSuccess.course.title}</p>
                                    <p className="text-sm text-gray-500 mb-6">by {codeSuccess.course.creator_name}</p>
                                    <button
                                        onClick={() => { setShowCodeModal(false); navigate(`/my-courses/${codeSuccess.course.id}`); }}
                                        className="w-full py-3 rounded-xl font-semibold btn-primary"
                                    >
                                        Go to Course
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={enrollCode}
                                            onChange={e => { setEnrollCode(e.target.value.toUpperCase()); setCodeError(''); }}
                                            placeholder="e.g. A3F1B2"
                                            className="w-full text-center font-mono text-2xl tracking-[0.3em] uppercase py-4"
                                            maxLength={6}
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && handleEnrollByCode()}
                                        />
                                    </div>
                                    {codeError && (
                                        <p className="text-red-400 text-sm mb-4 text-center">{codeError}</p>
                                    )}
                                    <button
                                        onClick={handleEnrollByCode}
                                        disabled={enrolling || !enrollCode.trim()}
                                        className="w-full py-3 rounded-xl font-semibold btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {enrolling ? 'Joining…' : 'Join Course'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div
                    className="max-w-md mx-auto mb-6 animate-fade-in-up"
                    style={{ animationDelay: '0.06s' }}
                >
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search courses by name or description…"
                        aria-label="Search courses"
                        className="w-full px-4 py-2.5"
                    />
                </div>

                {/* Filters */}
                <div
                    className="mb-10 space-y-3 animate-fade-in-up"
                    style={{ animationDelay: '0.07s' }}
                >
                    <div className="flex flex-wrap justify-center gap-3">
                        {['all', 'beginner', 'intermediate', 'advanced'].map(filterOption => (
                            <button
                                key={filterOption}
                                onClick={() => setFilter(filterOption)}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                    filter === filterOption
                                        ? 'gradient-bg text-white shadow-md'
                                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                }`}
                            >
                                {filterOption === 'all' ? 'All Courses' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                            </button>
                        ))}
                    </div>
                    {availableLanguages.length > 1 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {['all', ...availableLanguages].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setLangFilter(lang)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                        langFilter === lang
                                            ? 'bg-[#fef483]/20 text-[#fef483] border border-[#fef483]/40'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                    }`}
                                >
                                    {lang === 'all' ? 'All Languages' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Course Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCourses.map((course, index) => {
                        const langConfig = getLanguageConfig(course.language, index);
                        return (
                            <div
                                key={course.id}
                                onClick={() => handleCourseClick(course.id)}
                                className="surface-card card-hover cursor-pointer overflow-hidden group animate-fade-in-up"
                                style={{ animationDelay: `${0.08 + index * 0.04}s` }}
                            >
                                {/* Language Banner */}
                                <div className={`h-28 flex flex-col items-center justify-center bg-gradient-to-br ${langConfig.gradient} relative overflow-hidden`}>
                                    <div
                                        className="absolute inset-0 opacity-10"
                                        style={{
                                            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                                            backgroundSize: '28px 28px',
                                        }}
                                    />
                                    <span
                                        className="relative text-3xl font-extrabold font-mono tracking-tight leading-none"
                                        style={{ color: langConfig.textColor, textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                                    >
                                        {langConfig.label}
                                    </span>
                                    <span
                                        className="relative text-[10px] font-semibold uppercase tracking-[0.2em] mt-1.5 opacity-70"
                                        style={{ color: langConfig.textColor }}
                                    >
                                        {course.language || 'code'}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    {/* Badges */}
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
                                            {course.difficulty}
                                        </span>
                                        {course.is_private && (
                                            <span className="inline-flex items-center gap-1 badge bg-[#a1609d]/15 text-[#b88ab5]">
                                                <IconLock /> Private
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-base font-semibold mb-2 leading-snug group-hover:text-[#fef483] transition-colors duration-200">
                                        {course.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                                        {course.description}
                                    </p>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1.5">
                                                <IconBook />
                                                {course.chapter_count || 0} ch.
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <IconCode />
                                                {course.exercise_count || 0} ex.
                                            </span>
                                        </div>
                                        <span className="flex items-center gap-1.5">
                                            <IconClock />
                                            ~{course.estimated_hours || 1}h
                                        </span>
                                    </div>

                                    {/* Learning Objectives */}
                                    {course.learning_objectives && course.learning_objectives.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-white/5">
                                            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">You'll learn</p>
                                            <div className="flex flex-col gap-1">
                                                {course.learning_objectives.slice(0, 2).map((obj, i) => (
                                                    <span key={i} className="text-xs text-gray-400 leading-snug">
                                                        — {obj.length > 38 ? obj.substring(0, 38) + '…' : obj}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* CTA */}
                                    <button className="w-full mt-4 py-2 rounded-lg font-medium text-sm gradient-bg text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        View Course →
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {filteredCourses.length === 0 && (
                    <div className="text-center py-20 animate-fade-in-up">
                        <div className="text-gray-600 flex justify-center mb-4">
                            <IconSearch />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                        <p className="text-gray-400">Try adjusting your filter to see more results.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Courses;
