import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ProfessorDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const response = await courseService.getProfessorCourses();
            setCourses(response.data);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            return;
        }
        try {
            await courseService.deleteCourse(courseId);
            setCourses(courses.filter(c => c.id !== courseId));
        } catch (error) {
            console.error('Error deleting course:', error);
            alert(error.response?.data?.error || 'Failed to delete course');
        }
    };

    const getDifficultyBadgeClass = (difficulty) => {
        switch(difficulty) {
            case 'beginner': return 'badge-beginner';
            case 'intermediate': return 'badge-intermediate';
            case 'advanced': return 'badge-advanced';
            default: return 'badge-beginner';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading your courses...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                            Professor <span className="text-[#a1609d]">Dashboard</span>
                        </h1>
                        <p className="text-gray-400">
                            Welcome back, {user?.username}! Manage your courses and track student progress.
                        </p>
                    </div>
                    <Link 
                        to="/professor/create-course"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white no-underline transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                    >
                        <span className="text-xl">+</span>
                        <span>Create Course</span>
                    </Link>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold text-[#a1609d]">{courses.length}</div>
                        <div className="text-sm text-gray-400 mt-1">Total Courses</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold text-[#a1609d]">
                            {courses.reduce((acc, c) => acc + (parseInt(c.exercise_count) || 0), 0)}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Total Exercises</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold text-[#a1609d]">
                            {courses.reduce((acc, c) => acc + (parseInt(c.chapter_count) || 0), 0)}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Total Chapters</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold text-[#a1609d]">
                            {courses.reduce((acc, c) => acc + (parseInt(c.enrollment_count) || 0), 0)}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Total Enrollments</div>
                    </div>
                </div>

                {/* Courses Section */}
                {courses.length === 0 ? (
                    <div className="surface-card rounded-3xl p-12 text-center">
                        <div className="text-6xl mb-6">📚</div>
                        <h2 className="text-2xl font-bold mb-3">No Courses Yet</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            Start creating your first course and share your knowledge with students.
                        </p>
                        <Link 
                            to="/professor/create-course"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white no-underline text-lg"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                        >
                            <span>+</span>
                            <span>Create Your First Course</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
                        <div className="grid gap-4">
                            {courses.map((course) => (
                                <div 
                                    key={course.id}
                                    className="surface-card rounded-xl p-6 flex flex-col lg:flex-row lg:items-center gap-4"
                                >
                                    {/* Course Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold">{course.title}</h3>
                                            <span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
                                                {course.difficulty}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                            {course.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>📖 {course.chapter_count || 0} chapters</span>
                                            <span>💻 {course.exercise_count || 0} exercises</span>
                                            <span>👥 {course.enrollment_count || 0} enrolled</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Link
                                            to={`/professor/course/${course.id}/students`}
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-[#fef483] border border-[#fef483]/30 hover:bg-[#fef483]/10 transition-colors no-underline"
                                        >
                                            Students
                                        </Link>
                                        <a
                                            href={`http://localhost:8501?course_id=${course.id}&professor_id=${user?.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-[#4ade80] border border-[#4ade80]/30 hover:bg-[#4ade80]/10 transition-colors no-underline"
                                        >
                                            Analytics
                                        </a>
                                        <Link
                                            to={`/professor/course/${course.id}`}
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-white no-underline"
                                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                        >
                                            Edit Course
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteCourse(course.id)}
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfessorDashboard;
