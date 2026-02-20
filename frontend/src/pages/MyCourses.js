import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

const MyCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadMyCourses();
    }, []);

    const loadMyCourses = async () => {
        try {
            const response = await courseService.getUserCourses();
            setCourses(response.data);
        } catch (error) {
            console.error('Error loading my courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || seconds === 0) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const handleCourseClick = (courseId) => {
        navigate(`/my-courses/${courseId}`);
    };

    const getDifficultyBadgeClass = (difficulty) => {
        switch(difficulty) {
            case 'beginner': return 'badge-beginner';
            case 'intermediate': return 'badge-intermediate';
            case 'advanced': return 'badge-advanced';
            default: return 'badge-beginner';
        }
    };

    const getProgressPercentage = (course) => {
        if (!course.total_exercises || course.total_exercises === 0) return 0;
        return Math.round((course.completed_exercises / course.total_exercises) * 100);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading your courses...</p>
                </div>
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="min-h-screen pt-20 pb-8 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="surface-card rounded-3xl p-12 text-center glow-sm">
                        <div className="text-6xl mb-6">📚</div>
                        <h2 className="text-2xl font-bold mb-3">No Courses Yet</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            You haven't enrolled in any courses yet. Start your learning journey today!
                        </p>
                        <button 
                            onClick={() => navigate('/courses')} 
                            className="btn-primary px-8 py-4 text-lg"
                        >
                            Browse Courses
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                        My <span className="gradient-text">Learning Dashboard</span>
                    </h1>
                    <p className="text-gray-400">
                        Track your progress and continue learning
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold gradient-text">{courses.length}</div>
                        <div className="text-sm text-gray-400 mt-1">Enrolled Courses</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold gradient-text">
                            {courses.reduce((acc, c) => acc + (c.completed_exercises || 0), 0)}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Exercises Completed</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold gradient-text">
                            {formatTime(courses.reduce((acc, c) => acc + (c.total_time_spent || 0), 0))}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Total Time</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold gradient-text">
                            {courses.filter(c => getProgressPercentage(c) === 100).length}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Completed</div>
                    </div>
                </div>

                {/* Course Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => {
                        const progress = getProgressPercentage(course);
                        
                        return (
                            <div
                                key={course.id}
                                onClick={() => handleCourseClick(course.id)}
                                className="surface-card card-hover cursor-pointer p-6 group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold group-hover:text-[#fef483] transition-colors mb-2">
                                            {course.title}
                                        </h3>
                                        <span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
                                            {course.difficulty}
                                        </span>
                                    </div>
                                    {progress === 100 && (
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <span className="text-green-400">✓</span>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-gray-400 text-sm mb-5 line-clamp-2">
                                    {course.description}
                                </p>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-400">Progress</span>
                                        <span className="font-medium text-[#fef483]">{progress}%</span>
                                    </div>
                                    <div className="progress-bar-container h-2">
                                        <div 
                                            className="progress-bar"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {course.completed_exercises || 0} / {course.total_exercises || 0} exercises
                                    </p>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span title="Attempts">🎯 {course.total_attempts || 0}</span>
                                        <span title="Avg Score">
                                            📊 {course.average_score ? `${Math.round(course.average_score)}%` : '-'}
                                        </span>
                                        <span title="Time Spent">⏱️ {formatTime(course.total_time_spent)}</span>
                                    </div>
                                </div>

                                {/* Enrolled Date */}
                                <p className="text-xs text-gray-600 mt-4">
                                    Enrolled {new Date(course.enrolled_at).toLocaleDateString()}
                                </p>

                                {/* Continue Button */}
                                <button className="w-full mt-4 py-2.5 rounded-lg font-medium text-sm border border-white/10 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5">
                                    Continue Learning →
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
