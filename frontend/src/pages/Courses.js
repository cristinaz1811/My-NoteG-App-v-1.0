import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const response = await courseService.getAllCourses();
            setCourses(response.data);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseClick = (courseId) => {
        navigate(`/courses/${courseId}`);
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
            'from-cyan-500 to-blue-600',
            'from-amber-500 to-orange-600',
            'from-rose-500 to-red-600',
            'from-teal-500 to-cyan-600',
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

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                        Popular <span className="gradient-text">Learning Paths</span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Choose your path and start building the skills employers are looking for.
                    </p>
                </div>

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
                                    {course.tags && course.tags.slice(0, 1).map((tag, i) => (
                                        <span key={i} className="badge bg-white/5 text-gray-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
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
