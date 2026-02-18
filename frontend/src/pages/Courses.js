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

    if (loading) {
        return <div className="loading">Loading courses...</div>;
    }

    return (
        <div className="container courses-page">
            <div className="courses-header">
                <h1>📚 Course Catalog</h1>
                <p className="courses-subtitle">
                    Explore our programming courses and start your learning journey
                </p>
            </div>

            {/* Filters */}
            <div className="course-filters">
                <button 
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All Courses
                </button>
                <button 
                    className={`filter-btn ${filter === 'beginner' ? 'active' : ''}`}
                    onClick={() => setFilter('beginner')}
                >
                    Beginner
                </button>
                <button 
                    className={`filter-btn ${filter === 'intermediate' ? 'active' : ''}`}
                    onClick={() => setFilter('intermediate')}
                >
                    Intermediate
                </button>
                <button 
                    className={`filter-btn ${filter === 'advanced' ? 'active' : ''}`}
                    onClick={() => setFilter('advanced')}
                >
                    Advanced
                </button>
            </div>

            {/* Course Grid */}
            <div className="courses-catalog">
                {filteredCourses.map((course) => (
                    <div
                        key={course.id}
                        className="course-catalog-card"
                        onClick={() => handleCourseClick(course.id)}
                    >
                        <div className="course-card-header">
                            <span className={`difficulty-badge ${course.difficulty}`}>
                                {course.difficulty}
                            </span>
                            {course.tags && course.tags.length > 0 && (
                                <div className="course-tags">
                                    {course.tags.slice(0, 2).map((tag, i) => (
                                        <span key={i} className="tag">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <h3 className="course-card-title">{course.title}</h3>
                        
                        <p className="course-card-description">
                            {course.description}
                        </p>

                        {course.long_description && (
                            <p className="course-card-long-desc">
                                {course.long_description.substring(0, 150)}...
                            </p>
                        )}
                        
                        <div className="course-card-stats">
                            <div className="stat">
                                <span className="stat-icon">📖</span>
                                <span>{course.chapter_count || 0} Chapters</span>
                            </div>
                            <div className="stat">
                                <span className="stat-icon">💻</span>
                                <span>{course.exercise_count} Exercises</span>
                            </div>
                            <div className="stat">
                                <span className="stat-icon">⏱️</span>
                                <span>~{course.estimated_hours || 1}h</span>
                            </div>
                        </div>

                        {course.learning_objectives && course.learning_objectives.length > 0 && (
                            <div className="course-card-objectives">
                                <span className="objectives-label">You'll learn:</span>
                                <ul>
                                    {course.learning_objectives.slice(0, 2).map((obj, i) => (
                                        <li key={i}>{obj}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="course-card-footer">
                            <button className="view-course-btn">
                                View Course →
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCourses.length === 0 && (
                <div className="no-courses">
                    <p>No courses found for this filter.</p>
                </div>
            )}
        </div>
    );
};

export default Courses;
