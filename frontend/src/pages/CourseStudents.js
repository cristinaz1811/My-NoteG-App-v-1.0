import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseService } from '../services/api';

const CourseStudents = () => {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [exerciseStats, setExerciseStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetails, setStudentDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showExercisePerformance, setShowExercisePerformance] = useState(false);

    useEffect(() => {
        loadCourseAndStudents();
    }, [id]);

    const loadCourseAndStudents = async () => {
        try {
            const [courseRes, studentsRes] = await Promise.all([
                courseService.getCourseById(id),
                courseService.getCourseStudents(id)
            ]);
            setCourse(courseRes.data);
            setStudents(studentsRes.data);
        } catch (error) {
            console.error('Error loading course students:', error);
        } finally {
            setLoading(false);
        }
        courseService.getCourseExerciseStats(id)
            .then(res => setExerciseStats(res.data))
            .catch(err => console.error('Error loading exercise stats:', err));
    };

    const loadStudentDetails = async (studentId) => {
        setLoadingDetails(true);
        try {
            const response = await courseService.getStudentDetails(id, studentId);
            setStudentDetails(response.data);
            setSelectedStudent(response.data.student);
        } catch (error) {
            console.error('Error loading student details:', error);
        } finally {
            setLoadingDetails(false);
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

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getProgressPercentage = (student) => {
        const total = parseInt(student.total_exercises) || 0;
        const completed = parseInt(student.completed_exercises) || 0;
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    };

    const getDifficultyBadgeClass = (difficulty) => {
        switch(difficulty) {
            case 'easy': return 'badge-beginner';
            case 'medium': return 'badge-intermediate';
            case 'hard': return 'badge-advanced';
            default: return 'badge-beginner';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading students...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <Link 
                    to={`/professor/course/${id}`}
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 no-underline"
                >
                    <span>←</span> Back to Course
                </Link>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Enrolled <span className="text-[#a1609d]">Students</span>
                    </h1>
                    <p className="text-gray-400">{course?.title}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold text-[#a1609d]">{students.length}</div>
                        <div className="text-sm text-gray-400 mt-1">Total Students</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold text-[#a1609d]">
                            {students.filter(s => getProgressPercentage(s) === 100).length}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Completed Course</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold text-[#a1609d]">
                            {Math.round(students.reduce((sum, s) => sum + getProgressPercentage(s), 0) / (students.length || 1))}%
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Avg Progress</div>
                    </div>
                    <div className="surface-card rounded-xl p-5">
                        <div className="text-3xl font-bold text-[#a1609d]">
                            {Math.round(students.reduce((sum, s) => sum + (parseFloat(s.average_score) || 0), 0) / (students.length || 1))}%
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Avg Score</div>
                    </div>
                </div>

                {/* Exercise Performance — collapsible */}
                {exerciseStats.length > 0 && (
                    <div className="surface-card rounded-2xl p-6 mb-8">
                        <button
                            type="button"
                            onClick={() => setShowExercisePerformance(prev => !prev)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <div>
                                <h2 className="text-xl font-semibold mb-1">Exercise Performance</h2>
                                <p className="text-sm text-gray-400">
                                    Class-wide pass rates — lower rates show where students struggle most.
                                </p>
                            </div>
                            <span className={`text-gray-500 text-sm transition-transform duration-200 ${
                                showExercisePerformance ? 'rotate-180' : ''
                            }`}>
                                ▼
                            </span>
                        </button>

                        {showExercisePerformance && (
                            <div className="mt-4 space-y-2">
                                {exerciseStats.map((ex) => {
                                    const attempted = parseInt(ex.students_attempted) || 0;
                                    const completed = parseInt(ex.students_completed) || 0;
                                    const passRate = attempted > 0
                                        ? Math.round((completed / attempted) * 100)
                                        : null;
                                    const rateColor = passRate === null ? '#6b7280'
                                        : passRate >= 70 ? '#4ade80'
                                        : passRate >= 40 ? '#fbbf24'
                                        : '#f87171';
                                    return (
                                        <div
                                            key={ex.exercise_id}
                                            className="flex items-center gap-4 py-2.5 px-3 bg-black/20 rounded-lg"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{ex.exercise_title}</p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {ex.chapter_title || 'No chapter'}
                                                    {ex.difficulty ? ` · ${ex.difficulty}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-xs text-gray-400 text-right hidden sm:block">
                                                <div>{attempted} attempted</div>
                                                <div>{ex.avg_attempts || 0} avg tries</div>
                                            </div>
                                            <div className="w-28 flex-shrink-0">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-400">Pass rate</span>
                                                    <span style={{ color: rateColor }}>
                                                        {passRate === null ? '—' : `${passRate}%`}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{ width: `${passRate || 0}%`, background: rateColor }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Students List */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Students ({students.length})</h2>
                        {students.length === 0 ? (
                            <div className="surface-card rounded-2xl p-8 text-center">
                                <p className="text-gray-400">No students enrolled yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {students.map((student) => {
                                    const progress = getProgressPercentage(student);
                                    const isSelected = selectedStudent?.id === student.id;
                                    
                                    return (
                                        <div 
                                            key={student.id}
                                            onClick={() => loadStudentDetails(student.id)}
                                            className={`surface-card rounded-xl p-4 cursor-pointer transition-all ${
                                                isSelected ? 'ring-2 ring-[#a1609d]' : 'hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h3 className="font-semibold">{student.username}</h3>
                                                    <p className="text-sm text-gray-400">{student.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-[#a1609d]">{progress}%</div>
                                                    <div className="text-xs text-gray-500">progress</div>
                                                </div>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                                <div 
                                                    className="h-full rounded-full transition-all"
                                                    style={{ 
                                                        width: `${progress}%`,
                                                        background: 'linear-gradient(90deg, #a1609d, #b870ad)'
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>⏱️ {formatTime(student.total_time_spent)}</span>
                                                <span>📝 {student.total_attempts} attempts</span>
                                                <span>📅 {formatDate(student.enrolled_at)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Student Details Panel */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Student Details</h2>
                        {!selectedStudent ? (
                            <div className="surface-card rounded-2xl p-8 text-center">
                                <p className="text-gray-400">Select a student to view details</p>
                            </div>
                        ) : loadingDetails ? (
                            <div className="surface-card rounded-2xl p-8 text-center">
                                <div className="w-10 h-10 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading details...</p>
                            </div>
                        ) : studentDetails ? (
                            <div className="space-y-4">
                                {/* Student Info */}
                                <div className="surface-card rounded-xl p-5">
                                    <h3 className="font-semibold text-lg mb-4">{studentDetails.student.username}</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">Email</span>
                                            <p>{studentDetails.student.email}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Enrolled</span>
                                            <p>{formatDate(studentDetails.enrollment.enrolled_at)}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Exercises</span>
                                            <p>{studentDetails.stats.completed_exercises} / {studentDetails.stats.total_exercises}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Progress</span>
                                            <p>{studentDetails.stats.progress_percentage}%</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Total Attempts</span>
                                            <p>{studentDetails.stats.total_attempts}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Avg Score</span>
                                            <p>{studentDetails.stats.average_score}%</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-400">Time Spent</span>
                                            <p>{formatTime(studentDetails.stats.total_time_spent)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Exercise Progress */}
                                <div className="surface-card rounded-xl p-5">
                                    <h4 className="font-semibold mb-3">Exercise Progress</h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {studentDetails.exercises.map((exercise) => (
                                            <div 
                                                key={exercise.id}
                                                className="flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${exercise.completed ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                                                    <span className="text-sm">{exercise.title}</span>
                                                    <span className={`badge text-xs ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                                                        {exercise.difficulty}
                                                    </span>
                                                </div>
                                                <div className="text-right text-xs text-gray-400">
                                                    <span>{exercise.attempts} tries</span>
                                                    {exercise.best_score > 0 && (
                                                        <span className="ml-2 text-green-400">{exercise.best_score}%</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recent Submissions */}
                                {studentDetails.recentSubmissions.length > 0 && (
                                    <div className="surface-card rounded-xl p-5">
                                        <h4 className="font-semibold mb-3">Recent Submissions</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {studentDetails.recentSubmissions.map((sub) => (
                                                <div 
                                                    key={sub.id}
                                                    className="flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg text-sm"
                                                >
                                                    <div>
                                                        <span className="text-white">{sub.exercise_title}</span>
                                                        <span className={`ml-2 text-xs ${sub.status === 'passed' ? 'text-green-400' : 'text-red-400'}`}>
                                                            {sub.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-right text-xs">
                                                        <span className="text-gray-400">{sub.tests_passed}/{sub.tests_total}</span>
                                                        <span className="ml-2 text-gray-500">{formatDateTime(sub.submitted_at)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Time Sessions */}
                                {studentDetails.timeSessions.length > 0 && (
                                    <div className="surface-card rounded-xl p-5">
                                        <h4 className="font-semibold mb-3">Study Sessions</h4>
                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {studentDetails.timeSessions.map((session, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg text-sm"
                                                >
                                                    <span className="text-gray-400">{formatDateTime(session.started_at)}</span>
                                                    <span className="text-white">{formatTime(session.duration_seconds)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseStudents;
