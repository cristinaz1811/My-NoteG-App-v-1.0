import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
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

    if (loading) {
        return <div className="loading">Loading courses...</div>;
    }

    return (
        <div className="container">
            <h1>Available Courses</h1>
            <div className="courses-grid">
                {courses.map((course) => (
                    <div
                        key={course.id}
                        className="course-card"
                        onClick={() => handleCourseClick(course.id)}
                    >
                        <h3>{course.title}</h3>
                        <span className={`difficulty ${course.difficulty}`}>
                            {course.difficulty}
                        </span>
                        <p>{course.description}</p>
                        <p style={{ color: '#999', fontSize: '0.875rem' }}>
                            {course.exercise_count} exercises
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Courses;
