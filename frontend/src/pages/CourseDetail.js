import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

const CourseDetail = () => {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrolled, setEnrolled] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadCourse();
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

    const handleEnroll = async () => {
        try {
            await courseService.enrollInCourse(id);
            setEnrolled(true);
            alert('Successfully enrolled in the course!');
        } catch (error) {
            console.error('Error enrolling:', error);
            alert(error.response?.data?.error || 'Failed to enroll');
        }
    };

    const handleExerciseClick = (exerciseId) => {
        navigate(`/exercises/${exerciseId}`);
    };

    if (loading) {
        return <div className="loading">Loading course...</div>;
    }

    if (!course) {
        return <div className="container">Course not found</div>;
    }

    return (
        <div className="container">
            <h1>{course.title}</h1>
            <p style={{ fontSize: '1.125rem', color: '#666', marginBottom: '1rem' }}>
                {course.description}
            </p>
            <span className={`difficulty ${course.difficulty}`}>
                {course.difficulty}
            </span>
            
            {!enrolled && (
                <button 
                    onClick={handleEnroll} 
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                >
                    Enroll in Course
                </button>
            )}

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Exercises</h2>
            <div className="courses-grid">
                {course.exercises?.map((exercise) => (
                    <div
                        key={exercise.id}
                        className="course-card"
                        onClick={() => handleExerciseClick(exercise.id)}
                    >
                        <h3>{exercise.title}</h3>
                        <span className={`difficulty ${exercise.difficulty}`}>
                            {exercise.difficulty}
                        </span>
                        <p>{exercise.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CourseDetail;
