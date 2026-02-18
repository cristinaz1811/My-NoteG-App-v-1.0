import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

const CourseDetail = () => {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [checkingEnrollment, setCheckingEnrollment] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadCourse();
        checkEnrollment();
    }, [id]);

    const loadCourse = async () => {
        try {
            const response = await courseService.getCourseById(id);
            setCourse(response.data);
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

    if (loading || checkingEnrollment) {
        return <div className="loading">Loading course...</div>;
    }

    if (!course) {
        return <div className="container">Course not found</div>;
    }

    const exerciseCount = course.exercises?.length || 0;
    const estimatedHours = Math.max(1, Math.ceil(exerciseCount * 0.5));

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

    // Not enrolled - show course preview
    return (
        <div className="container course-preview">
            <div className="course-header-preview">
                <h1>{course.title}</h1>
                <span className={`difficulty ${course.difficulty}`}>
                    {course.difficulty}
                </span>
            </div>

            <p className="course-description-preview">
                {course.description}
            </p>

            {/* Course Stats */}
            <div className="course-stats-preview">
                <div className="stat-item">
                    <span className="stat-number">{exerciseCount}</span>
                    <span className="stat-label">Exercises</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">~{estimatedHours}h</span>
                    <span className="stat-label">Estimated Time</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{course.difficulty}</span>
                    <span className="stat-label">Difficulty</span>
                </div>
            </div>

            {/* Enroll CTA */}
            <div className="enroll-cta">
                <h3>Ready to start learning?</h3>
                <p>Enroll now to track your progress, submit solutions, and earn achievements.</p>
                <button 
                    onClick={handleEnroll} 
                    className="btn btn-primary btn-large"
                >
                    Enroll in Course
                </button>
            </div>

            {/* Exercise Preview - Not clickable */}
            <div className="exercises-preview">
                <h2>📚 Course Content Preview</h2>
                <p className="preview-note">Enroll to access and solve these exercises</p>
                
                <div className="exercise-preview-list">
                    {course.exercises?.map((exercise, index) => (
                        <div key={exercise.id} className="exercise-preview-item">
                            <div className="exercise-number">{index + 1}</div>
                            <div className="exercise-preview-info">
                                <h4>{exercise.title}</h4>
                                <div className="exercise-preview-meta">
                                    <span className={`difficulty ${exercise.difficulty}`}>
                                        {exercise.difficulty}
                                    </span>
                                    <span className="language-badge">{exercise.language}</span>
                                </div>
                                <p className="exercise-preview-desc">{exercise.description}</p>
                            </div>
                            <div className="locked-badge">🔒</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
