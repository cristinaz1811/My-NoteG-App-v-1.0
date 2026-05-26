import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const CourseDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [checkingEnrollment, setCheckingEnrollment] = useState(!user); // Only check if authenticated
    const [expandedChapters, setExpandedChapters] = useState({});
    const [enrollmentCode, setEnrollmentCode] = useState('');
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [codeError, setCodeError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadCourse();
        if (user) {
            checkEnrollment();
        } else {
            setCheckingEnrollment(false);
        }
    }, [id, user]);

    const loadCourse = async () => {
        try {
            const response = await courseService.getCourseById(id);
            setCourse(response.data);
            if (response.data.chapters?.length > 0) {
                setExpandedChapters({ [response.data.chapters[0].id]: true });
            }
        } catch (error) {
            console.error('Error loading course:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkEnrollment = async () => {
        try {
            await courseService.getEnrolledCourseDetails(id);
            setIsEnrolled(true);
        } catch (error) {
            setIsEnrolled(false);
        } finally {
            setCheckingEnrollment(false);
        }
    };

    const handleEnroll = async () => {
        try {
            setCodeError('');
            await courseService.enrollInCourse(id, enrollmentCode || undefined);
            navigate(`/my-courses/${id}`);
        } catch (error) {
            console.error('Error enrolling:', error);
            if (error.response?.data?.requiresCode) {
                setShowCodeInput(true);
                setCodeError('This is a private course. Please enter the enrollment code.');
            } else {
                setCodeError(error.response?.data?.error || 'Failed to enroll');
            }
        }
    };

    const handleUnenroll = async () => {
        if (!window.confirm('Are you sure you want to unenroll from this course? Your progress will be lost.')) {
            return;
        }
        try {
            await courseService.unenrollFromCourse(id);
            setIsEnrolled(false);
        } catch (error) {
            console.error('Error unenrolling:', error);
            alert(error.response?.data?.error || 'Failed to unenroll');
        }
    };

    const handleGoToCourse = () => {
        navigate(`/my-courses/${id}`);
    };

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };

    const getDifficultyBadgeClass = (difficulty) => {
        switch(difficulty) {
            case 'beginner': return 'badge-beginner';
            case 'intermediate': return 'badge-intermediate';
            case 'advanced': return 'badge-advanced';
            default: return 'badge-beginner';
        }
    };

    if (loading || checkingEnrollment) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading course...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl font-semibold text-gray-500 mb-4">Course unavailable</div>
                    <h2 className="text-2xl font-bold mb-2">Course not found</h2>
                    <button onClick={() => navigate('/courses')} className="btn-primary mt-4">
                        Browse Courses
                    </button>
                </div>
            </div>
        );
    }

    const exerciseCount = course.exercises?.length || 0;
    const chapterCount = course.chapters?.length || 0;

    // Course detail view (same for enrolled and non-enrolled, different action buttons)
    return (
        <div className="min-h-screen py-8 px-6 page-fade-in">
            <div className="max-w-7xl mx-auto">
                {/* Hero Section */}
                <div className="surface-card rounded-3xl p-8 lg:p-12 mb-8 glow-sm">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Content */}
                        <div className="lg:col-span-2">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                <span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
                                    {course.difficulty}
                                </span>
                                {course.tags?.map((tag, i) => (
                                    <span key={i} className="badge bg-white/5 text-gray-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-3xl lg:text-4xl font-bold mb-4">{course.title}</h1>
                            <p className="text-lg text-gray-400 mb-8">{course.description}</p>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl gradient-bg opacity-20 flex items-center justify-center">
                                        <span className="text-sm font-semibold">Ch.</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{chapterCount}</div>
                                        <div className="text-sm text-gray-400">Chapters</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl gradient-bg opacity-20 flex items-center justify-center">
                                        <span className="text-sm font-semibold">Ex.</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{exerciseCount}</div>
                                        <div className="text-sm text-gray-400">Exercises</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl gradient-bg opacity-20 flex items-center justify-center">
                                        <span className="text-sm font-semibold">Hrs</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">~{course.estimated_hours || 1}h</div>
                                        <div className="text-sm text-gray-400">Duration</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                {isEnrolled ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-green-400 text-sm uppercase tracking-wide">Active</span>
                                            <h3 className="text-xl font-semibold">You're Enrolled!</h3>
                                        </div>
                                        <button 
                                            onClick={handleGoToCourse} 
                                            className="w-full btn-primary py-4 text-lg mb-3"
                                        >
                                            Continue Learning →
                                        </button>
                                        <button 
                                            onClick={handleUnenroll} 
                                            className="w-full py-3 text-sm text-gray-400 hover:text-red-400 transition-colors border border-white/10 rounded-lg hover:border-red-400/30"
                                        >
                                            Unenroll from Course
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-semibold mb-4">Start Learning Today</h3>
                                        
                                        {/* Private course badge */}
                                        {course.is_private && (
                                            <div className="flex items-center gap-2 mb-4 p-2 bg-[#a1609d]/10 rounded-lg border border-[#a1609d]/20">
                                                <span className="text-xs uppercase tracking-wide text-[#b870ad]">Private</span>
                                                <span className="text-sm text-[#b870ad]">Private Course — Enrollment code required</span>
                                            </div>
                                        )}

                                        {/* Enrollment code input for private courses */}
                                        {(course.is_private || showCodeInput) && (
                                            <div className="mb-4">
                                                <label className="block text-sm text-gray-400 mb-2">Enrollment Code</label>
                                                <input
                                                    type="text"
                                                    value={enrollmentCode}
                                                    onChange={(e) => { setEnrollmentCode(e.target.value.toUpperCase()); setCodeError(''); }}
                                                    placeholder="Enter code..."
                                                    className="w-full font-mono text-center text-lg tracking-widest uppercase"
                                                    maxLength={6}
                                                />
                                                {codeError && (
                                                    <p className="text-red-400 text-sm mt-2">{codeError}</p>
                                                )}
                                            </div>
                                        )}

                                        <button 
                                            onClick={handleEnroll} 
                                            className="w-full btn-primary py-4 text-lg mb-4"
                                            disabled={course.is_private && !enrollmentCode}
                                        >
                                            {course.is_private ? 'Enroll with Code' : 'Enroll Now - It\'s Free'}
                                        </button>

                                        {!codeError && (
                                            <div className="space-y-3 text-sm text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-green-400">✓</span>
                                                    <span>Track your progress</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-green-400">✓</span>
                                                    <span>Get instant feedback</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-green-400">✓</span>
                                                    <span>Earn completion certificate</span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* About Section */}
                        {course.long_description && (
                            <div className="surface-card rounded-2xl p-6">
                                <h2 className="text-xl font-semibold mb-4">About This Course</h2>
                                <p className="text-gray-400 leading-relaxed">{course.long_description}</p>
                            </div>
                        )}

                        {/* Learning Objectives */}
                        {course.learning_objectives?.length > 0 && (
                            <div className="surface-card rounded-2xl p-6">
                                <h2 className="text-xl font-semibold mb-4">What You'll Learn</h2>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {course.learning_objectives.map((obj, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="text-[#fef483] mt-1">•</span>
                                            <span className="text-gray-300">{obj}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prerequisites */}
                        {course.prerequisites?.length > 0 && (
                            <div className="surface-card rounded-2xl p-6">
                                <h2 className="text-xl font-semibold mb-4">Prerequisites</h2>
                                <ul className="space-y-2">
                                    {course.prerequisites.map((prereq, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-400">
                                            <span className="text-indigo-400">•</span>
                                            {prereq}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Table of Contents */}
                        <div className="surface-card rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6">Course Content</h2>

                            {course.chapters?.length > 0 ? (
                                <div className="space-y-3">
                                    {course.chapters.map((chapter, chapterIndex) => (
                                        <div key={chapter.id} className="border border-white/10 rounded-xl overflow-hidden">
                                            <div 
                                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                                onClick={() => toggleChapter(chapter.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-sm font-semibold">
                                                        {chapterIndex + 1}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium">{chapter.title}</h3>
                                                        <p className="text-sm text-gray-500">
                                                            {chapter.exercises?.length || 0} exercises
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-gray-500 text-sm">
                                                    {expandedChapters[chapter.id] ? '▼' : '▶'}
                                                </span>
                                            </div>

                                            {expandedChapters[chapter.id] && chapter.exercises?.length > 0 && (
                                                <div className="border-t border-white/5 bg-black/20">
                                                    {chapter.exercises.map((exercise, exIndex) => {
                                                        const isFirstExercise = chapterIndex === 0 && exIndex === 0;
                                                        const canAccess = isEnrolled || isFirstExercise;
                                                        return (
                                                            <div 
                                                                key={exercise.id} 
                                                                className={`flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-b-0 ${
                                                                    canAccess ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''
                                                                }`}
                                                                onClick={() => canAccess && navigate(`/exercises/${exercise.id}`)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-sm text-gray-500 w-8">
                                                                        {chapterIndex + 1}.{exIndex + 1}
                                                                    </span>
                                                                    <span className="text-gray-300">{exercise.title}</span>
                                                                    <span className={`badge text-xs ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                                                                        {exercise.difficulty}
                                                                    </span>
                                                                    {exercise.is_multi_file && (
                                                                        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">Multi-file</span>
                                                                    )}
                                                                    {exercise.time_limit_minutes && (
                                                                        <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{exercise.time_limit_minutes}m</span>
                                                                    )}
                                                                    {isFirstExercise && !isEnrolled && (
                                                                        <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Demo</span>
                                                                    )}
                                                                </div>
                                                                <span className={isFirstExercise ? 'text-green-400' : 'text-gray-500'}>
                                                                    {isFirstExercise && !isEnrolled ? 'Try Demo' : canAccess ? '→' : 'Locked'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : course.exercises?.length > 0 ? (
                                <div className="space-y-2">
                                    {course.exercises.map((exercise, index) => {
                                        const isFirstExercise = index === 0;
                                        const canAccess = isEnrolled || isFirstExercise;
                                        return (
                                            <div 
                                                key={exercise.id}
                                                className={`flex items-center justify-between p-4 border border-white/10 rounded-xl ${
                                                    canAccess ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''
                                                }`}
                                                onClick={() => canAccess && navigate(`/exercises/${exercise.id}`)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-500 w-8">{index + 1}</span>
                                                    <span className="text-gray-300">{exercise.title}</span>
                                                    <span className={`badge text-xs ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                                                        {exercise.difficulty}
                                                    </span>
                                                    {exercise.is_multi_file && (
                                                        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">Multi-file</span>
                                                    )}
                                                    {exercise.time_limit_minutes && (
                                                        <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{exercise.time_limit_minutes}m</span>
                                                    )}
                                                    {isFirstExercise && !isEnrolled && (
                                                        <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Demo</span>
                                                    )}
                                                </div>
                                                <span className={isFirstExercise ? 'text-green-400' : 'text-gray-500'}>
                                                    {isFirstExercise && !isEnrolled ? 'Try Demo' : canAccess ? '→' : 'Locked'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500">No content available yet.</p>
                            )}
                        </div>

                        {course.materials?.length > 0 && (
                            <div className="surface-card rounded-2xl p-6">
                                <h2 className="text-xl font-semibold mb-4">Course Materials</h2>
                                <div className="space-y-3">
                                    {course.materials.map((material) => (
                                        <a
                                            key={material.id}
                                            href={material.resource_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block rounded-xl border border-white/10 p-4 hover:bg-white/5 transition-colors no-underline"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="text-xs uppercase tracking-wide text-gray-500">
                                                        {material.chapter_title || 'Course level'} · {material.resource_type}
                                                    </div>
                                                    <div className="font-medium text-white mt-1">{material.title}</div>
                                                    {material.description && <p className="text-sm text-gray-400 mt-1">{material.description}</p>}
                                                </div>
                                                <span className="text-sm text-[#fef483]">Open</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            {/* Mobile Enroll Button */}
                            <div className="lg:hidden surface-card rounded-2xl p-6">
                                {course.is_private && (
                                    <div className="mb-3">
                                        <label className="block text-sm text-gray-400 mb-2">Enrollment Code</label>
                                        <input
                                            type="text"
                                            value={enrollmentCode}
                                            onChange={(e) => { setEnrollmentCode(e.target.value.toUpperCase()); setCodeError(''); }}
                                            placeholder="Enter code..."
                                            className="w-full font-mono text-center text-lg tracking-widest uppercase"
                                            maxLength={6}
                                        />
                                    </div>
                                )}
                                <button 
                                    onClick={handleEnroll} 
                                    className="w-full btn-primary py-4 text-lg"
                                    disabled={course.is_private && !enrollmentCode}
                                >
                                    {course.is_private ? 'Enroll with Code' : 'Enroll Now - It\'s Free'}
                                </button>
                            </div>

                            {/* Instructor Card */}
                            {course.creator_name && (
                                <div className="surface-card rounded-2xl p-6">
                                    <h3 className="font-semibold mb-4">Instructor</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg">
                                            {course.creator_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">{course.creator_name}</p>
                                            <p className="text-sm text-gray-400">Course Creator</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
