import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

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

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';

    const handleCourseClick = (courseId) => {
        if (isProfessor) {
            navigate(`/my-courses/${courseId}`);
        } else {
            navigate(`/courses/${courseId}`);
        }
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

    const filteredCourses = filter === 'all' 
        ? courses 
        : courses.filter(c => c.difficulty === filter);

    const getDifficultyBadgeClass = (difficulty) => {
        switch(difficulty) {
            case 'beginner': return 'badge-beginner';
            case 'intermediate': return 'badge-intermediate';
            case 'advanced': return 'badge-advanced';
            default: return 'badge-beginner';
        }
    };

    const getCourseEmoji = (index) => {
        const emojis = ['🌐', '🐍', '🤖', '📱', '⚛️', '🎨', '🔧', '📊'];
        return emojis[index % emojis.length];
    };

    const getCourseGradient = (index) => {
        const gradients = [
            'from-orange-500 to-red-600',
            'from-blue-500 to-indigo-600',
            'from-purple-500 to-pink-600',
            'from-green-500 to-emerald-600',
            'from-fuchsia-500 to-purple-600',
            'from-amber-500 to-orange-600',
            'from-rose-500 to-red-600',
            'from-violet-500 to-purple-600',
        ];
        return gradients[index % gradients.length];
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading courses...</p>
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
        <div className="min-h-screen pt-20 pb-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    {isProfessor ? (
                        <>
                            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                                My <span className="gradient-text">Courses</span>
                            </h1>
                            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
                                Browse and preview your published courses as students see them.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                                Popular <span className="gradient-text">Learning Paths</span>
                            </h1>
                            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
                                Choose your path and start building the skills employers are looking for.
                            </p>
                        </>
                    )}
                    {user && !isProfessor && (
                        <button
                            onClick={() => { setShowCodeModal(true); setCodeError(''); setCodeSuccess(null); setEnrollCode(''); }}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-[#a1609d] border border-[#a1609d]/30 hover:bg-[#a1609d]/10 transition-colors"
                        >
                            🔑 Join with Enrollment Code
                        </button>
                    )}
                </div>

                {/* Join with Code Modal */}
                {showCodeModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowCodeModal(false)}>
                        <div className="surface-card rounded-2xl p-8 max-w-md w-full glow-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Join a Private Course</h2>
                                <button onClick={() => setShowCodeModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                            </div>
                            <p className="text-gray-400 text-sm mb-6">
                                Enter the enrollment code provided by your professor to join a private course.
                            </p>

                            {codeSuccess ? (
                                <div className="text-center">
                                    <div className="text-5xl mb-4">🎉</div>
                                    <h3 className="text-lg font-semibold mb-2">Successfully enrolled!</h3>
                                    <p className="text-gray-400 mb-2">{codeSuccess.course.title}</p>
                                    <p className="text-sm text-gray-500 mb-6">by {codeSuccess.course.creator_name}</p>
                                    <button
                                        onClick={() => { setShowCodeModal(false); navigate(`/my-courses/${codeSuccess.course.id}`); }}
                                        className="w-full py-3 rounded-xl font-semibold text-white"
                                        style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                    >
                                        Go to Course →
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={enrollCode}
                                            onChange={(e) => { setEnrollCode(e.target.value.toUpperCase()); setCodeError(''); }}
                                            placeholder="e.g. A3F1B2"
                                            className="w-full text-center font-mono text-2xl tracking-[0.3em] uppercase py-4"
                                            maxLength={6}
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleEnrollByCode()}
                                        />
                                    </div>
                                    {codeError && (
                                        <p className="text-red-400 text-sm mb-4 text-center">{codeError}</p>
                                    )}
                                    <button
                                        onClick={handleEnrollByCode}
                                        disabled={enrolling || !enrollCode.trim()}
                                        className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                    >
                                        {enrolling ? 'Joining...' : 'Join Course'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {['all', 'beginner', 'intermediate', 'advanced'].map((filterOption) => (
                        <button
                            key={filterOption}
                            onClick={() => setFilter(filterOption)}
                            className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                                filter === filterOption
                                    ? 'gradient-bg text-white'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            {filterOption === 'all' ? 'All Courses' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Course Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCourses.map((course, index) => (
                        <div
                            key={course.id}
                            onClick={() => handleCourseClick(course.id)}
                            className="surface-card card-hover cursor-pointer overflow-hidden group"
                        >
                            {/* Course Header with Gradient */}
                            <div className={`h-32 flex items-center justify-center bg-gradient-to-br ${getCourseGradient(index)}`}>
                                <span className="text-5xl transform group-hover:scale-110 transition-transform">
                                    {getCourseEmoji(index)}
                                </span>
                            </div>

                            {/* Course Content */}
                            <div className="p-6">
                                {/* Tags */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
                                        {course.difficulty}
                                    </span>
                                    {course.is_private && (
                                        <span className="badge bg-[#a1609d]/20 text-[#a1609d]" title="Private - Enrollment code required">
                                            🔒
                                        </span>
                                    )}
                                    {course.tags && course.tags.slice(0, 1).map((tag, i) => (
                                        <span key={i} className="badge bg-white/5 text-gray-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-semibold mb-2 group-hover:text-[#fef483] transition-colors">
                                    {course.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                    {course.description}
                                </p>

                                {/* Stats */}
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            📖 {course.chapter_count || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            💻 {course.exercise_count || 0}
                                        </span>
                                    </div>
                                    <span className="flex items-center gap-1">
                                        ⏱️ ~{course.estimated_hours || 1}h
                                    </span>
                                </div>

                                {/* Learning Objectives Preview */}
                                {course.learning_objectives && course.learning_objectives.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <p className="text-xs text-gray-500 mb-2">You'll learn:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {course.learning_objectives.slice(0, 2).map((obj, i) => (
                                                <span key={i} className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                                                    {obj.length > 30 ? obj.substring(0, 30) + '...' : obj}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                <button className="w-full mt-4 py-2.5 rounded-lg font-medium text-sm gradient-bg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    View Course →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredCourses.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                        <p className="text-gray-400">Try adjusting your filter to see more results.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Courses;
