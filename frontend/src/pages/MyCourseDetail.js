import React, { useEffect, useState, useCallback, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ChapterLearningPath from '../components/ChapterLearningPath';
import LectureToExercisePrompt from '../components/LectureToExercisePrompt';
import ExerciseCompletePrompt from '../components/ExerciseCompletePrompt';

const MyCourseDetail = () => {
    const { courseId } = useParams();
    const { user } = useContext(AuthContext);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('content');
    const [liveTime, setLiveTime] = useState(0);
    const [isTracking, setIsTracking] = useState(false);
    const [expandedSubmission, setExpandedSubmission] = useState(null);
    const [lectureToExercisePrompt, setLectureToExercisePrompt] = useState(null);
    const [exerciseCompletePrompt, setExerciseCompletePrompt] = useState(null);
    const navigate = useNavigate();
    const heartbeatRef = useRef(null);
    const timerRef = useRef(null);
    const trackingStartRef = useRef(null);
    // Ref so timer callbacks always read the latest persisted total without a closure dependency
    const totalTimeRef = useRef(0);

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

    const isContentTab = activeTab === 'content';

    // Keep ref in sync so the timer interval always uses the latest persisted total
    useEffect(() => {
        totalTimeRef.current = data?.stats?.totalTimeSpent || 0;
    }, [data?.stats?.totalTimeSpent]);

    useEffect(() => {
        if (!isContentTab) {
            setIsTracking(false);
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
            clearInterval(timerRef.current);
            timerRef.current = null;
            courseService.endTimeSession(courseId).then(loadCourseDetails).catch(console.error);
            return;
        }

        const startTracking = async () => {
            // Don't track when the browser tab is hidden — prevents idle-tab inflation
            if (document.hidden) return;
            setIsTracking(true);
            trackingStartRef.current = Date.now();

            try { await courseService.startTimeSession(courseId); } catch (e) {
                console.error('Error starting time session:', e);
            }

            clearInterval(heartbeatRef.current);
            heartbeatRef.current = setInterval(() => {
                courseService.heartbeat(courseId).catch(console.error);
            }, 30000);

            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                if (trackingStartRef.current) {
                    const elapsed = Math.floor((Date.now() - trackingStartRef.current) / 1000);
                    setLiveTime(totalTimeRef.current + elapsed);
                }
            }, 1000);
        };

        const stopTracking = () => {
            setIsTracking(false);
            trackingStartRef.current = null;
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
            clearInterval(timerRef.current);
            timerRef.current = null;
            courseService.endTimeSession(courseId).then(loadCourseDetails).catch(console.error);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopTracking();
            } else {
                startTracking();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        startTracking();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
            clearInterval(timerRef.current);
            timerRef.current = null;
            courseService.endTimeSession(courseId).catch(console.error);
        };
    }, [courseId, isContentTab, loadCourseDetails]);

    useEffect(() => {
        loadCourseDetails();
    }, [loadCourseDetails]);

    const formatTime = (seconds, showSeconds = false) => {
        if (!seconds || seconds === 0) return showSeconds ? '0s' : '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (showSeconds) {
            if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
            if (minutes > 0) return `${minutes}m ${secs}s`;
            return `${secs}s`;
        }
        
        if (hours > 0) return `${hours}h ${minutes}m`;
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
                    <div className="w-10 h-10 border-2 border-[#a1609d]/30 border-t-[#a1609d] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Loading course…</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h2 className="text-2xl font-bold mb-2">Course not found</h2>
                    <button onClick={() => navigate('/my-courses')} className="btn-primary mt-4">
                        Back to My Courses
                    </button>
                </div>
            </div>
        );
    }

    const { course, stats, exercises, submissions, lectures, timeBreakdown } = data;

    return (
        <div className="min-h-screen py-6 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/my-courses')} 
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                >
                    <span>←</span> Back to My Courses
                </button>

                {/* Course Header */}
                <div className="surface-card rounded-2xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{course.title}</h1>
                            <div className="flex items-center gap-3">
                                <span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
                                    {course.difficulty}
                                </span>
                                <p className="text-gray-400 text-sm">{course.description}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl w-fit">
                    {[
                        { id: 'content', label: '🎓 Learning Path', tracking: true },
                        { id: 'dashboard', label: '📊 Dashboard', tracking: false },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                                activeTab === tab.id
                                    ? 'gradient-bg text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[60vh]">
                    {/* Learning Path Tab */}
                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            {/* Chapters with mixed lectures and exercises */}
                            {data.chapters && data.chapters.length > 0 ? (
                                <>
                                    {data.chapters.map((chapter) => (
                                        <ChapterLearningPath
                                            key={chapter.id}
                                            chapter={chapter}
                                            onItemClick={(item) => {
                                                if (item.type === 'lecture') {
                                                    navigate(`/lectures/${item.id}`);
                                                } else {
                                                    navigate(`/exercises/${item.id}`);
                                                }
                                            }}
                                        />
                                    ))}

                                    {/* Unassigned items */}
                                    {data.unassignedItems && data.unassignedItems.length > 0 && (
                                        <ChapterLearningPath
                                            chapter={{
                                                id: 'unassigned',
                                                title: 'Additional Content',
                                                description: 'Exercises and lectures not assigned to a chapter',
                                                order_index: 999,
                                                items: data.unassignedItems
                                            }}
                                            onItemClick={(item) => {
                                                if (item.type === 'lecture') {
                                                    navigate(`/lectures/${item.id}`);
                                                } else {
                                                    navigate(`/exercises/${item.id}`);
                                                }
                                            }}
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="surface-card rounded-2xl p-12 text-center">
                                    <div className="text-5xl mb-4">📚</div>
                                    <h3 className="text-xl font-semibold mb-2">No content yet</h3>
                                    <p className="text-gray-400">
                                        Your instructor hasn't added any chapters, lectures, or exercises yet.
                                    </p>
                                </div>
                            )}

                            {/* Learning Objectives */}
                            <div className="surface-card rounded-2xl p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <span>📚</span> Learning Objectives
                                </h3>
                                <ul className="space-y-3">
                                    {course.learning_objectives?.length > 0
                                        ? course.learning_objectives.map((obj, i) => (
                                            <li key={i} className="flex items-start gap-3 text-gray-300">
                                                <span className="text-[#fef483] mt-1">✓</span>
                                                {obj}
                                            </li>
                                        ))
                                        : (
                                            <>
                                                <li className="flex items-start gap-3 text-gray-300">
                                                    <span className="text-[#fef483] mt-1">✓</span>
                                                    Master {course.title} fundamentals
                                                </li>
                                                <li className="flex items-start gap-3 text-gray-300">
                                                    <span className="text-[#fef483] mt-1">✓</span>
                                                    Complete {stats.totalExercises} hands-on exercises
                                                </li>
                                            </>
                                        )
                                    }
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="surface-card rounded-xl p-5 text-center">
                                    <div className="text-3xl mb-1">📝</div>
                                    <div className="text-2xl font-bold gradient-text">{stats.totalAttempts}</div>
                                    <div className="text-sm text-gray-400">Total Attempts</div>
                                </div>
                                <div className="surface-card rounded-xl p-5 text-center">
                                    <div className="text-3xl mb-1">📊</div>
                                    <div className="text-2xl font-bold gradient-text">{stats.averageScore}%</div>
                                    <div className="text-sm text-gray-400">Average Score</div>
                                </div>
                                <div className="surface-card rounded-xl p-5 text-center">
                                    <div className="text-3xl mb-1">⏱️</div>
                                    <div className="text-2xl font-bold gradient-text">{formatTime(stats.totalTimeSpent)}</div>
                                    <div className="text-sm text-gray-400">Time Spent</div>
                                </div>
                                <div className="surface-card rounded-xl p-5 text-center">
                                    <div className="text-3xl mb-1">✅</div>
                                    <div className="text-2xl font-bold gradient-text">{stats.progressPercentage}%</div>
                                    <div className="text-sm text-gray-400">Completed</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="surface-card rounded-2xl p-6">
                                <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
                                <div className="progress-bar-container h-4 mb-3">
                                    <div 
                                        className="progress-bar"
                                        style={{ width: `${stats.progressPercentage}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-400">
                                    {stats.completedExercises} of {stats.totalExercises} exercises completed
                                </p>
                            </div>

                            {/* Submission History */}
                            <div className="surface-card rounded-2xl p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <span>📊</span> Submission History
                                </h3>
                                {submissions.length === 0 ? (
                                    <p className="text-gray-400">No submissions yet. Start solving exercises!</p>
                                ) : (
                                    <div className="space-y-2">
                                        {submissions.slice(0, 20).map((sub) => {
                                            const isExpanded = expandedSubmission === sub.id;
                                            return (
                                                <div key={sub.id} className="rounded-xl border border-white/5 overflow-hidden transition-all">
                                                    {/* Row header — clickable */}
                                                    <div
                                                        onClick={() => setExpandedSubmission(isExpanded ? null : sub.id)}
                                                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                                                            isExpanded ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                                sub.status === 'passed' ? 'bg-green-500' : sub.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                                                            }`}></span>
                                                            <span className="text-sm text-gray-300 truncate">{sub.exercise_title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4 flex-shrink-0">
                                                            <span className={`text-sm font-medium ${
                                                                Number(sub.score) === 100 ? 'text-green-400' : 'text-[#fef483]'
                                                            }`}>
                                                                {Number(sub.score).toFixed(0)}%
                                                            </span>
                                                            <span className="text-xs text-gray-500">{sub.tests_passed}/{sub.tests_total}</span>
                                                            <span className="text-xs text-gray-600">{formatDate(sub.submitted_at)}</span>
                                                            <span className={`text-[10px] text-gray-500 transition-transform duration-200 ${
                                                                isExpanded ? 'rotate-180' : ''
                                                            }`}>▼</span>
                                                        </div>
                                                    </div>
                                                    {/* Expanded code view */}
                                                    {isExpanded && (
                                                        <div className="border-t border-white/5">
                                                            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03]">
                                                                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Submitted Code</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-gray-600 font-mono">{sub.language || 'code'}</span>
                                                                    {sub.code && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigator.clipboard.writeText(sub.code);
                                                                            }}
                                                                            className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                                                        >
                                                                            Copy
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {sub.code ? (
                                                                <pre className="px-4 py-3 text-xs font-mono text-gray-300 overflow-x-auto max-h-[400px] overflow-y-auto leading-5 whitespace-pre bg-black/20">{sub.code}</pre>
                                                            ) : (
                                                                <div className="px-4 py-4 text-xs text-gray-500 text-center">Code not available for this submission</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Time Breakdown */}
                            <div className="surface-card rounded-2xl p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <span>⏱️</span> Time Spent by Day
                                </h3>
                                {timeBreakdown.length === 0 ? (
                                    <p className="text-gray-400">No time tracking data yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {timeBreakdown.map((day, index) => (
                                            <div key={index} className="flex items-center gap-4">
                                                <span className="text-sm text-gray-500 w-24">
                                                    {new Date(day.date).toLocaleDateString()}
                                                </span>
                                                <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                                                    <div 
                                                        className="h-full gradient-bg rounded-full"
                                                        style={{ width: `${Math.min((day.time_spent / 3600) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm text-gray-400 w-16 text-right">
                                                    {formatTime(day.time_spent)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-sm text-gray-400">
                                        <strong className="text-gray-300">Total Time Recorded:</strong> {formatTime(stats.totalTimeSpent)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Prompts */}
                {lectureToExercisePrompt && (
                    <LectureToExercisePrompt
                        nextExercise={lectureToExercisePrompt}
                        onStart={() => {
                            navigate(`/exercises/${lectureToExercisePrompt.id}`);
                            setLectureToExercisePrompt(null);
                        }}
                        onSkip={() => setLectureToExercisePrompt(null)}
                        onClose={() => setLectureToExercisePrompt(null)}
                    />
                )}

                {exerciseCompletePrompt && (
                    <ExerciseCompletePrompt
                        score={exerciseCompletePrompt.score}
                        nextItem={exerciseCompletePrompt.nextItem}
                        isChapterComplete={exerciseCompletePrompt.isChapterComplete}
                        onContinue={() => {
                            if (exerciseCompletePrompt.nextItem) {
                                if (exerciseCompletePrompt.nextItem.type === 'lecture') {
                                    navigate(`/lectures/${exerciseCompletePrompt.nextItem.id}`);
                                } else {
                                    navigate(`/exercises/${exerciseCompletePrompt.nextItem.id}`);
                                }
                            }
                            setExerciseCompletePrompt(null);
                        }}
                        onClose={() => setExerciseCompletePrompt(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default MyCourseDetail;
