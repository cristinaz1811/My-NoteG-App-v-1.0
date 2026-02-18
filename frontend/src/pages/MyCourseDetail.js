import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

const MyCourseDetail = () => {
    const { courseId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('content'); // Default to content tab
    const [liveTime, setLiveTime] = useState(0);
    const [isTracking, setIsTracking] = useState(false); // Track if we're currently tracking time
    const navigate = useNavigate();
    const heartbeatRef = useRef(null);
    const timerRef = useRef(null);
    const trackingStartRef = useRef(null); // When tracking started for current tab

    const loadCourseDetails = useCallback(async () => {
        try {
            const response = await courseService.getEnrolledCourseDetails(courseId);
            setData(response.data);
            setLiveTime(response.data?.stats?.totalTimeSpent || 0);
        } catch (error) {
            console.error('Error loading course details:', error);
            if (error.response?.status === 404) {
                navigate('/my-courses');
            }
        } finally {
            setLoading(false);
        }
    }, [courseId, navigate]);

    // Content tabs where time should be tracked
    const isContentTab = activeTab === 'content' || activeTab === 'exercises';

    // Time tracking - only when on content tabs
    useEffect(() => {
        if (isContentTab) {
            // Start tracking
            setIsTracking(true);
            trackingStartRef.current = Date.now();
            
            const startSession = async () => {
                try {
                    await courseService.startTimeSession(courseId);
                } catch (error) {
                    console.error('Error starting time session:', error);
                }
            };
            startSession();

            // Set up heartbeat every 30 seconds
            heartbeatRef.current = setInterval(async () => {
                try {
                    await courseService.heartbeat(courseId);
                } catch (error) {
                    console.error('Heartbeat error:', error);
                }
            }, 30000);

            // Live timer update every second
            timerRef.current = setInterval(() => {
                if (trackingStartRef.current && data?.stats?.totalTimeSpent !== undefined) {
                    const elapsed = Math.floor((Date.now() - trackingStartRef.current) / 1000);
                    setLiveTime(data.stats.totalTimeSpent + elapsed);
                }
            }, 1000);

        } else {
            // Stop tracking when on dashboard tabs
            setIsTracking(false);
            
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            
            // End session to save time
            courseService.endTimeSession(courseId).then(() => {
                // Refresh data to get updated time
                loadCourseDetails();
            }).catch(console.error);
        }

        // Cleanup on unmount
        return () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (isContentTab) {
                courseService.endTimeSession(courseId).catch(console.error);
            }
        };
    }, [courseId, isContentTab, data?.stats?.totalTimeSpent, loadCourseDetails]);

    useEffect(() => {
        loadCourseDetails();
    }, [loadCourseDetails]);

    const formatTime = (seconds, showSeconds = false) => {
        if (!seconds || seconds === 0) return showSeconds ? '0s' : '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (showSeconds) {
            if (hours > 0) {
                return `${hours}h ${minutes}m ${secs}s`;
            }
            if (minutes > 0) {
                return `${minutes}m ${secs}s`;
            }
            return `${secs}s`;
        }
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <div className="loading">Loading course details...</div>;
    }

    if (!data) {
        return <div className="container">Course not found</div>;
    }

    const { course, stats, exercises, submissions, timeBreakdown } = data;

    return (
        <div className="container my-course-detail">
            <button onClick={() => navigate('/my-courses')} className="back-btn">
                ← Back to My Courses
            </button>

            <div className="course-header-detail">
                <h1>{course.title}</h1>
                <span className={`difficulty ${course.difficulty}`}>
                    {course.difficulty}
                </span>
            </div>

            <p className="course-description">{course.description}</p>

            {/* Tracking Indicator */}
            {isTracking && (
                <div className="tracking-banner">
                    🔴 Time is being tracked - You're studying course content
                </div>
            )}

            {/* Tabs */}
            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveTab('content')}
                >
                    📖 Course Content
                </button>
                <button 
                    className={`tab ${activeTab === 'exercises' ? 'active' : ''}`}
                    onClick={() => setActiveTab('exercises')}
                >
                    💻 Exercises
                </button>
                <button 
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* Course Content Tab - Time is tracked here */}
                {activeTab === 'content' && (
                    <div className="course-content-section">
                        <div className="content-info">
                            <h3>Course Materials</h3>
                            <p className="course-full-description">{course.description}</p>
                            
                            <div className="content-cards">
                                <div className="content-card">
                                    <h4>📚 Learning Objectives</h4>
                                    <ul>
                                        <li>Master {course.title} fundamentals</li>
                                        <li>Complete {stats.totalExercises} hands-on exercises</li>
                                        <li>Build practical programming skills</li>
                                    </ul>
                                </div>
                                <div className="content-card">
                                    <h4>⏱️ Estimated Time</h4>
                                    <p>Approximately {Math.max(1, Math.ceil(stats.totalExercises * 0.5))} hours</p>
                                    <p>You've spent: {formatTime(liveTime, true)}</p>
                                </div>
                            </div>

                            <div className="start-learning">
                                <h4>Ready to practice?</h4>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => setActiveTab('exercises')}
                                >
                                    Go to Exercises →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exercises Tab - Time is tracked here */}
                {activeTab === 'exercises' && (
                    <div className="exercises-list">
                        {exercises.map((exercise) => (
                            <div 
                                key={exercise.id} 
                                className={`exercise-item ${exercise.completed ? 'completed' : ''}`}
                                onClick={() => navigate(`/exercises/${exercise.id}`)}
                            >
                                <div className="exercise-status">
                                    {exercise.completed ? '✅' : '⭕'}
                                </div>
                                <div className="exercise-info">
                                    <h4>{exercise.title}</h4>
                                    <span className={`difficulty ${exercise.difficulty}`}>
                                        {exercise.difficulty}
                                    </span>
                                    <span className="language-badge">{exercise.language}</span>
                                </div>
                                <div className="exercise-stats">
                                    <span>Best: {exercise.best_score}%</span>
                                    <span>Attempts: {exercise.attempts}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Dashboard Tab - Time is NOT tracked here */}
                {activeTab === 'dashboard' && (
                    <div className="dashboard-section">
                        <div className="dashboard-notice">
                            ⏸️ Time tracking is paused while viewing statistics
                        </div>

                        {/* Stats Cards */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">📝</div>
                                <div className="stat-content">
                                    <span className="stat-value">{stats.totalAttempts}</span>
                                    <span className="stat-label">Total Attempts</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">📊</div>
                                <div className="stat-content">
                                    <span className="stat-value">{stats.averageScore}%</span>
                                    <span className="stat-label">Average Score</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">⏱️</div>
                                <div className="stat-content">
                                    <span className="stat-value">{formatTime(stats.totalTimeSpent)}</span>
                                    <span className="stat-label">Time Spent</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">✅</div>
                                <div className="stat-content">
                                    <span className="stat-value">{stats.progressPercentage}%</span>
                                    <span className="stat-label">Completed</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="overall-progress">
                            <h3>Overall Progress</h3>
                            <div className="large-progress-bar-container">
                                <div 
                                    className="progress-bar"
                                    style={{ width: `${stats.progressPercentage}%` }}
                                ></div>
                            </div>
                            <p>{stats.completedExercises} of {stats.totalExercises} exercises completed</p>
                        </div>
                        
                        <h3>📊 Submission History</h3>
                        <div className="submissions-list">
                            {submissions.length === 0 ? (
                                <p>No submissions yet. Start solving exercises!</p>
                            ) : (
                                <table className="submissions-table">
                                    <thead>
                                        <tr>
                                            <th>Exercise</th>
                                            <th>Score</th>
                                            <th>Tests</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map((sub) => (
                                            <tr key={sub.id}>
                                                <td>{sub.exercise_title}</td>
                                                <td>{sub.score}%</td>
                                                <td>{sub.tests_passed}/{sub.tests_total}</td>
                                                <td>
                                                    <span className={`status ${sub.status}`}>
                                                        {sub.status}
                                                    </span>
                                                </td>
                                                <td>{formatDate(sub.submitted_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <h3>⏱️ Time Spent by Day</h3>
                        <div className="time-tracking">
                            {timeBreakdown.length === 0 ? (
                                <p>No time tracking data yet. Spend some time learning!</p>
                            ) : (
                                <div className="time-chart">
                                    {timeBreakdown.map((day, index) => (
                                        <div key={index} className="time-bar-row">
                                            <span className="time-date">
                                                {new Date(day.date).toLocaleDateString()}
                                            </span>
                                            <div className="time-bar-bg">
                                                <div 
                                                    className="time-bar-fill"
                                                    style={{ 
                                                        width: `${Math.min((day.time_spent / 3600) * 100, 100)}%` 
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="time-duration">
                                                {formatTime(day.time_spent)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="total-time">
                                <strong>Total Time Recorded:</strong> {formatTime(stats.totalTimeSpent)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyCourseDetail;
