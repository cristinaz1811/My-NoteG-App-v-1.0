import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

const CourseDetail = () => {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [checkingEnrollment, setCheckingEnrollment] = useState(true);
    const [expandedChapters, setExpandedChapters] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        loadCourse();
        checkEnrollment();
    }, [id]);

    const loadCourse = async () => {
        try {
            const response = await courseService.getCourseById(id);
            setCourse(response.data);
            // Expand first chapter by default
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
            await courseService.enrollInCourse(id);
            navigate(`/my-courses/${id}`);
        } catch (error) {
            console.error('Error enrolling:', error);
            alert(error.response?.data?.error || 'Failed to enroll');
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

    if (loading || checkingEnrollment) {
        return <div className="loading">Loading course...</div>;
    }

    if (!course) {
        return <div className="container">Course not found</div>;
    }

    const exerciseCount = course.exercises?.length || 0;
    const chapterCount = course.chapters?.length || 0;

    // If user is enrolled, show enrolled message
    if (isEnrolled) {
        return (
            <div className="container">
                <div className="enrolled-notice">
                    <div className="enrolled-icon">✅</div>
                    <h2>You're already enrolled in this course!</h2>
                    <p>Continue learning in your personal dashboard where your progress is tracked.</p>
                    <button 
                        onClick={handleGoToCourse} 
                        className="btn btn-primary btn-large"
                    >
                        Go to My Course →
                    </button>
                </div>
                
                <div className="course-summary-card">
                    <h3>{course.title}</h3>
                    <span className={`difficulty ${course.difficulty}`}>{course.difficulty}</span>
                    <p>{course.description}</p>
                </div>
            </div>
        );
    }

    // Not enrolled - show detailed course preview
    return (
        <div className="container course-detail-page">
            {/* Hero Section */}
            <div className="course-hero">
                <div className="course-hero-content">
                    <div className="course-badges">
                        <span className={`difficulty-badge ${course.difficulty}`}>
                            {course.difficulty}
                        </span>
                        {course.tags?.map((tag, i) => (
                            <span key={i} className="tag-badge">{tag}</span>
                        ))}
                    </div>
                    
                    <h1>{course.title}</h1>
                    <p className="course-short-desc">{course.description}</p>
                    
                    <div className="course-quick-stats">
                        <div className="quick-stat">
                            <span className="quick-stat-icon">📖</span>
                            <span className="quick-stat-value">{chapterCount}</span>
                            <span className="quick-stat-label">Chapters</span>
                        </div>
                        <div className="quick-stat">
                            <span className="quick-stat-icon">💻</span>
                            <span className="quick-stat-value">{exerciseCount}</span>
                            <span className="quick-stat-label">Exercises</span>
                        </div>
                        <div className="quick-stat">
                            <span className="quick-stat-icon">⏱️</span>
                            <span className="quick-stat-value">~{course.estimated_hours || 1}h</span>
                            <span className="quick-stat-label">Duration</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleEnroll} 
                        className="btn btn-primary btn-large enroll-hero-btn"
                    >
                        Enroll Now - Start Learning
                    </button>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="course-content-layout">
                {/* Main Content */}
                <div className="course-main-content">
                    {/* About Section */}
                    {course.long_description && (
                        <section className="course-section">
                            <h2>📋 About This Course</h2>
                            <p className="long-description">{course.long_description}</p>
                        </section>
                    )}

                    {/* Learning Objectives */}
                    {course.learning_objectives?.length > 0 && (
                        <section className="course-section">
                            <h2>🎯 What You'll Learn</h2>
                            <ul className="objectives-list">
                                {course.learning_objectives.map((obj, i) => (
                                    <li key={i}>
                                        <span className="check-icon">✓</span>
                                        {obj}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Prerequisites */}
                    {course.prerequisites?.length > 0 && (
                        <section className="course-section">
                            <h2>📝 Prerequisites</h2>
                            <ul className="prerequisites-list">
                                {course.prerequisites.map((prereq, i) => (
                                    <li key={i}>{prereq}</li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Table of Contents */}
                    <section className="course-section">
                        <h2>📚 Table of Contents</h2>
                        
                        {course.chapters?.length > 0 ? (
                            <div className="chapters-accordion">
                                {course.chapters.map((chapter, chapterIndex) => (
                                    <div key={chapter.id} className="chapter-item">
                                        <div 
                                            className={`chapter-header ${expandedChapters[chapter.id] ? 'expanded' : ''}`}
                                            onClick={() => toggleChapter(chapter.id)}
                                        >
                                            <div className="chapter-info">
                                                <span className="chapter-number">Chapter {chapterIndex + 1}</span>
                                                <h3>{chapter.title}</h3>
                                                <p className="chapter-desc">{chapter.description}</p>
                                            </div>
                                            <div className="chapter-meta">
                                                <span className="exercise-count">
                                                    {chapter.exercises?.length || 0} exercises
                                                </span>
                                                <span className="expand-icon">
                                                    {expandedChapters[chapter.id] ? '▼' : '▶'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {expandedChapters[chapter.id] && chapter.exercises?.length > 0 && (
                                            <div className="chapter-exercises">
                                                {chapter.exercises.map((exercise, exIndex) => (
                                                    <div key={exercise.id} className="exercise-preview-row">
                                                        <div className="exercise-preview-left">
                                                            <span className="exercise-index">
                                                                {chapterIndex + 1}.{exIndex + 1}
                                                            </span>
                                                            <div className="exercise-preview-details">
                                                                <span className="exercise-title">{exercise.title}</span>
                                                                <span className={`difficulty-sm ${exercise.difficulty}`}>
                                                                    {exercise.difficulty}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="locked-icon">🔒</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Fallback for courses without chapters
                            <div className="exercises-flat-list">
                                {course.exercises?.map((exercise, index) => (
                                    <div key={exercise.id} className="exercise-preview-row">
                                        <div className="exercise-preview-left">
                                            <span className="exercise-index">{index + 1}</span>
                                            <div className="exercise-preview-details">
                                                <span className="exercise-title">{exercise.title}</span>
                                                <span className={`difficulty-sm ${exercise.difficulty}`}>
                                                    {exercise.difficulty}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="locked-icon">🔒</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar */}
                <div className="course-sidebar">
                    <div className="enroll-card">
                        <h3>Start Learning Today</h3>
                        <div className="enroll-card-stats">
                            <div className="enroll-stat">
                                <span className="enroll-stat-value">{chapterCount}</span>
                                <span className="enroll-stat-label">Chapters</span>
                            </div>
                            <div className="enroll-stat">
                                <span className="enroll-stat-value">{exerciseCount}</span>
                                <span className="enroll-stat-label">Exercises</span>
                            </div>
                        </div>
                        <button 
                            onClick={handleEnroll} 
                            className="btn btn-primary btn-block"
                        >
                            Enroll in Course
                        </button>
                        <p className="enroll-note">
                            Free access • Track your progress • Get feedback
                        </p>
                    </div>

                    {course.creator_name && (
                        <div className="instructor-card">
                            <h4>Instructor</h4>
                            <p>{course.creator_name}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
