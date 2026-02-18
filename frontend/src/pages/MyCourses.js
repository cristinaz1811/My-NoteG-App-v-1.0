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

    if (loading) {
        return <div className="loading">Loading your courses...</div>;
    }

    if (courses.length === 0) {
        return (
            <div className="container">
                <h1>My Courses</h1>
                <div className="empty-state">
                    <p>You haven't enrolled in any courses yet.</p>
                    <button 
                        onClick={() => navigate('/courses')} 
                        className="btn btn-primary"
                    >
                        Browse Courses
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <h1>My Courses</h1>
            <p className="subtitle">Track your progress and continue learning</p>
            
            <div className="my-courses-grid">
                {courses.map((course) => (
                    <div
                        key={course.id}
                        className="my-course-card"
                        onClick={() => handleCourseClick(course.id)}
                    >
                        <div className="course-header">
                            <h3>{course.title}</h3>
                            <span className={`difficulty ${course.difficulty}`}>
                                {course.difficulty}
                            </span>
                        </div>
                        
                        <p className="course-description">{course.description}</p>
                        
                        <div className="progress-bar-container">
                            <div 
                                className="progress-bar"
                                style={{ 
                                    width: `${course.total_exercises > 0 
                                        ? (course.completed_exercises / course.total_exercises) * 100 
                                        : 0}%` 
                                }}
                            ></div>
                        </div>
                        <p className="progress-text">
                            {course.completed_exercises || 0} / {course.total_exercises || 0} exercises completed
                        </p>
                        
                        <div className="course-stats">
                            <div className="stat">
                                <span className="stat-value">{course.total_attempts || 0}</span>
                                <span className="stat-label">Attempts</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">
                                    {course.average_score ? `${Math.round(course.average_score)}%` : '-'}
                                </span>
                                <span className="stat-label">Avg Score</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{formatTime(course.total_time_spent)}</span>
                                <span className="stat-label">Time Spent</span>
                            </div>
                        </div>
                        
                        <div className="enrolled-date">
                            Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyCourses;
