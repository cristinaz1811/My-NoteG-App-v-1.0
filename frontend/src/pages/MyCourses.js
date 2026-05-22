import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

const IconCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const MyCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadMyCourses();
    }, []);

    const loadMyCourses = async () => {
        try {
            setLoadError(null);
            const response = await courseService.getUserCourses();
            setCourses(response.data);
        } catch (error) {
            console.error('Error loading my courses:', error);
            setLoadError('Something went wrong while loading your courses.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || seconds === 0) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const handleCourseClick = (courseId) => navigate(`/my-courses/${courseId}`);

    const handleUnenroll = async (e, courseId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to unenroll from this course? Your progress will be lost.')) return;
        try {
            await courseService.unenrollFromCourse(courseId);
            setCourses(courses.filter(c => c.id !== courseId));
        } catch (error) {
            console.error('Error unenrolling:', error);
            alert(error.response?.data?.error || 'Failed to unenroll');
        }
    };

    const getDifficultyBadgeClass = (difficulty) => {
        switch (difficulty) {
            case 'beginner':     return 'badge-beginner';
            case 'intermediate': return 'badge-intermediate';
            case 'advanced':     return 'badge-advanced';
            default:             return 'badge-beginner';
        }
    };

    const getProgress = (course) => {
        if (!course.total_exercises || course.total_exercises === 0) return 0;
        return Math.round((course.completed_exercises / course.total_exercises) * 100);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-[#a1609d]/30 border-t-[#a1609d] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Loading your courses…</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen pt-20 pb-8 px-6 page-fade-in">
                <div className="max-w-lg mx-auto text-center pt-20">
                    <h2 className="text-2xl font-bold mb-3">Couldn't load your courses</h2>
                    <p className="text-gray-400 mb-8">{loadError}</p>
                    <button
                        onClick={() => { setLoading(true); loadMyCourses(); }}
                        className="btn-primary px-8 py-3 text-base"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="min-h-screen pt-20 pb-8 px-6 page-fade-in">
                <div className="max-w-lg mx-auto text-center pt-20">
                    <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 opacity-50">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-3">No courses yet</h2>
                    <p className="text-gray-400 mb-8">You haven't enrolled in any courses yet. Start your learning journey today!</p>
                    <button onClick={() => navigate('/courses')} className="btn-primary px-8 py-3 text-base">
                        Browse Courses
                    </button>
                </div>
            </div>
        );
    }

    const totalAttempts   = courses.reduce((a, c) => a + (c.total_attempts || 0), 0);
    const totalCompleted  = courses.reduce((a, c) => a + (c.completed_exercises || 0), 0);
    const totalTime       = courses.reduce((a, c) => a + (c.total_time_spent || 0), 0);
    const doneCourses     = courses.filter(c => getProgress(c) === 100).length;

    return (
        <div className="min-h-screen pt-20 pb-8 px-6 page-fade-in">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-10 animate-fade-in-up">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                        My <span className="gradient-text">Learning Dashboard</span>
                    </h1>
                    <p className="text-gray-400">Track your progress and continue learning</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
                    {[
                        { label: 'Enrolled Courses',    value: courses.length },
                        { label: 'Exercises Completed', value: totalCompleted },
                        { label: 'Total Time',          value: formatTime(totalTime) },
                        { label: 'Courses Finished',    value: doneCourses },
                    ].map(({ label, value }) => (
                        <div key={label} className="surface-card rounded-xl p-5">
                            <div className="text-2xl font-bold gradient-text">{value}</div>
                            <div className="text-sm text-gray-400 mt-1">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Course Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course, index) => {
                        const progress = getProgress(course);
                        return (
                            <div
                                key={course.id}
                                onClick={() => handleCourseClick(course.id)}
                                className="surface-card card-hover cursor-pointer p-6 group animate-fade-in-up"
                                style={{ animationDelay: `${0.08 + index * 0.04}s` }}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 mr-3">
                                        <h3 className="text-base font-semibold group-hover:text-[#fef483] transition-colors duration-200 mb-2 leading-snug">
                                            {course.title}
                                        </h3>
                                        <span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
                                            {course.difficulty}
                                        </span>
                                    </div>
                                    {progress === 100 && (
                                        <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center text-green-400 flex-shrink-0">
                                            <IconCheck />
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-gray-400 text-sm mb-5 line-clamp-2 leading-relaxed">
                                    {course.description}
                                </p>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-gray-400">Progress</span>
                                        <span className="font-medium text-[#fef483]">{progress}%</span>
                                    </div>
                                    <div className="progress-bar-container h-1.5">
                                        <div className="progress-bar" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">
                                        {course.completed_exercises || 0} / {course.total_exercises || 0} exercises
                                    </p>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-xs text-gray-500">
                                    <span>{course.total_attempts || 0} attempts</span>
                                    <span>{course.average_score ? `${Math.round(course.average_score)}% avg` : '—'}</span>
                                    <span className="ml-auto">{formatTime(course.total_time_spent)}</span>
                                </div>

                                <p className="text-[11px] text-gray-600 mt-3">
                                    Enrolled {new Date(course.enrolled_at).toLocaleDateString()}
                                </p>

                                {/* Actions — visible on hover */}
                                <button className="w-full mt-4 py-2.5 rounded-lg font-medium text-sm border border-white/10 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white/5">
                                    Continue Learning →
                                </button>
                                <button
                                    onClick={e => handleUnenroll(e, course.id)}
                                    className="w-full mt-2 py-2 rounded-lg text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-red-400 hover:bg-red-400/5"
                                >
                                    Unenroll
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MyCourses;
