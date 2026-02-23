import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseService, plagiarismService } from '../services/api';

const PlagiarismDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [exercises, setExercises] = useState([]);
    const [reports, setReports] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(null);
    const [threshold, setThreshold] = useState(70);
    const [scanResult, setScanResult] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [coursesRes, notifRes] = await Promise.all([
                courseService.getProfessorCourses(),
                plagiarismService.getNotifications(),
            ]);
            setCourses(coursesRes.data);
            setNotifications(notifRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectCourse = async (course) => {
        setSelectedCourse(course);
        setScanResult(null);
        try {
            const [courseDetail, reportsRes] = await Promise.all([
                courseService.getCourseById(course.id),
                plagiarismService.getCourseReports(course.id),
            ]);
            setExercises(courseDetail.data.exercises || []);
            setReports(reportsRes.data);
        } catch (error) {
            console.error('Error loading course details:', error);
        }
    };

    const runScan = async (exerciseId) => {
        setScanning(exerciseId);
        setScanResult(null);
        try {
            const res = await plagiarismService.runScan(exerciseId, threshold);
            setScanResult(res.data);
            // Refresh reports
            if (selectedCourse) {
                const reportsRes = await plagiarismService.getCourseReports(selectedCourse.id);
                setReports(reportsRes.data);
            }
            // Refresh notifications
            const notifRes = await plagiarismService.getNotifications();
            setNotifications(notifRes.data);
        } catch (error) {
            console.error('Scan error:', error);
            setScanResult({ error: error.response?.data?.error || 'Failed to run scan' });
        } finally {
            setScanning(null);
        }
    };

    const markNotificationRead = async (notifId) => {
        try {
            await plagiarismService.markRead(notifId);
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking notification:', error);
        }
    };

    const getSeverityColor = (similarity) => {
        if (similarity >= 90) return '#ef4444';
        if (similarity >= 80) return '#f97316';
        if (similarity >= 70) return '#eab308';
        return '#22c55e';
    };

    const getSeverityLabel = (similarity) => {
        if (similarity >= 90) return 'Critical';
        if (similarity >= 80) return 'High';
        if (similarity >= 70) return 'Medium';
        return 'Low';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading plagiarism dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                            🔍 Plagiarism <span className="text-[#a1609d]">Detection</span>
                        </h1>
                        <p className="text-gray-400">
                            Compare student submissions and detect suspicious similarities.
                        </p>
                    </div>
                    <Link 
                        to="/professor"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-gray-300 no-underline transition-all hover:text-white surface-card"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Notifications Banner */}
                {notifications.filter(n => !n.is_read).length > 0 && (
                    <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div className="p-4">
                            <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                                <span>🔔</span>
                                Unread Alerts ({notifications.filter(n => !n.is_read).length})
                            </h3>
                            <div className="space-y-2">
                                {notifications.filter(n => !n.is_read).slice(0, 5).map(notif => (
                                    <div key={notif.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-color)' }}>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-300">{notif.message}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(notif.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => navigate(`/professor/plagiarism/report/${notif.report_id}`)}
                                                className="px-3 py-1.5 text-xs rounded-lg font-medium text-white border-none cursor-pointer transition-all hover:scale-105"
                                                style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                            >
                                                View Report
                                            </button>
                                            <button
                                                onClick={() => markNotificationRead(notif.id)}
                                                className="px-3 py-1.5 text-xs rounded-lg text-gray-400 hover:text-white border border-gray-600 bg-transparent cursor-pointer transition-all"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Panel: Course Selection */}
                    <div className="lg:col-span-1">
                        <div className="surface-card rounded-xl p-5">
                            <h2 className="text-lg font-semibold mb-4 text-white">Your Courses</h2>
                            <div className="space-y-2">
                                {courses.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => selectCourse(course)}
                                        className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer border-none ${
                                            selectedCourse?.id === course.id 
                                                ? 'text-white' 
                                                : 'text-gray-300 hover:text-white'
                                        }`}
                                        style={{ 
                                            background: selectedCourse?.id === course.id 
                                                ? 'linear-gradient(135deg, rgba(161, 96, 157, 0.3), rgba(184, 138, 181, 0.2))' 
                                                : 'var(--overlay-light)',
                                            border: selectedCourse?.id === course.id ? '1px solid rgba(161, 96, 157, 0.5)' : '1px solid transparent'
                                        }}
                                    >
                                        <div className="font-medium">{course.title}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {course.exercise_count || 0} exercises · {course.student_count || 0} students
                                        </div>
                                    </button>
                                ))}
                                {courses.length === 0 && (
                                    <p className="text-gray-500 text-sm text-center py-4">No courses found</p>
                                )}
                            </div>
                        </div>

                        {/* Threshold Setting */}
                        <div className="surface-card rounded-xl p-5 mt-4">
                            <h3 className="text-sm font-semibold text-gray-400 mb-3">Similarity Threshold</h3>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="30"
                                    max="95"
                                    value={threshold}
                                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                                    className="flex-1 accent-[#a1609d]"
                                />
                                <span className="text-lg font-bold text-[#a1609d] min-w-[3rem] text-right">{threshold}%</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Submissions with similarity above this threshold will be flagged.
                            </p>
                        </div>
                    </div>

                    {/* Right Panel: Exercises & Reports */}
                    <div className="lg:col-span-2">
                        {selectedCourse ? (
                            <>
                                {/* Exercises to Scan */}
                                <div className="surface-card rounded-xl p-5 mb-6">
                                    <h2 className="text-lg font-semibold mb-4 text-white">
                                        Exercises in "{selectedCourse.title}"
                                    </h2>
                                    {exercises.length > 0 ? (
                                        <div className="space-y-3">
                                            {exercises.map(ex => (
                                                <div key={ex.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--overlay-light)' }}>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-white">{ex.title}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {ex.difficulty} · {ex.language}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => runScan(ex.id)}
                                                        disabled={scanning !== null}
                                                        className="px-4 py-2 rounded-lg font-medium text-white border-none cursor-pointer transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        style={{ background: scanning === ex.id ? '#6b7280' : 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                                    >
                                                        {scanning === ex.id ? (
                                                            <span className="flex items-center gap-2">
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                Scanning...
                                                            </span>
                                                        ) : '🔍 Scan'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-4">No exercises in this course</p>
                                    )}
                                </div>

                                {/* Scan Result */}
                                {scanResult && (
                                    <div className="mb-6 rounded-xl overflow-hidden" 
                                         style={{ 
                                             background: scanResult.error 
                                                 ? 'rgba(239, 68, 68, 0.1)' 
                                                 : scanResult.report?.flaggedPairs > 0 
                                                     ? 'rgba(239, 68, 68, 0.1)' 
                                                     : 'rgba(34, 197, 94, 0.1)',
                                             border: `1px solid ${scanResult.error 
                                                 ? 'rgba(239, 68, 68, 0.3)' 
                                                 : scanResult.report?.flaggedPairs > 0 
                                                     ? 'rgba(239, 68, 68, 0.3)' 
                                                     : 'rgba(34, 197, 94, 0.3)'}`
                                         }}>
                                        <div className="p-5">
                                            {scanResult.error ? (
                                                <p className="text-red-400">{scanResult.error}</p>
                                            ) : (
                                                <>
                                                    <h3 className="font-semibold mb-3 flex items-center gap-2" 
                                                        style={{ color: scanResult.report?.flaggedPairs > 0 ? '#ef4444' : '#22c55e' }}>
                                                        {scanResult.report?.flaggedPairs > 0 ? '⚠️' : '✅'}
                                                        Scan Complete
                                                    </h3>
                                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                                        <div className="text-center p-3 rounded-lg" style={{ background: 'var(--surface-color)' }}>
                                                            <div className="text-2xl font-bold text-white">{scanResult.report?.totalSubmissions || 0}</div>
                                                            <div className="text-xs text-gray-500">Submissions</div>
                                                        </div>
                                                        <div className="text-center p-3 rounded-lg" style={{ background: 'var(--surface-color)' }}>
                                                            <div className="text-2xl font-bold" style={{ color: scanResult.report?.flaggedPairs > 0 ? '#ef4444' : '#22c55e' }}>
                                                                {scanResult.report?.flaggedPairs || 0}
                                                            </div>
                                                            <div className="text-xs text-gray-500">Flagged Pairs</div>
                                                        </div>
                                                        <div className="text-center p-3 rounded-lg" style={{ background: 'var(--surface-color)' }}>
                                                            <div className="text-2xl font-bold" style={{ color: getSeverityColor(scanResult.report?.maxSimilarity || 0) }}>
                                                                {scanResult.report?.maxSimilarity?.toFixed(1) || 0}%
                                                            </div>
                                                            <div className="text-xs text-gray-500">Max Similarity</div>
                                                        </div>
                                                    </div>

                                                    {scanResult.matches?.length > 0 && (
                                                        <div className="space-y-2">
                                                            {scanResult.matches.map((match, idx) => (
                                                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-color)' }}>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-sm font-medium text-gray-300">
                                                                            {match.userA.username}
                                                                        </span>
                                                                        <span className="text-gray-600">↔</span>
                                                                        <span className="text-sm font-medium text-gray-300">
                                                                            {match.userB.username}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="px-2 py-1 rounded text-xs font-bold"
                                                                              style={{ background: `${getSeverityColor(match.similarity)}20`, color: getSeverityColor(match.similarity) }}>
                                                                            {match.similarity.toFixed(1)}% ({getSeverityLabel(match.similarity)})
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {scanResult.report?.id && (
                                                        <button
                                                            onClick={() => navigate(`/professor/plagiarism/report/${scanResult.report.id}`)}
                                                            className="mt-4 px-4 py-2 rounded-lg font-medium text-white border-none cursor-pointer transition-all hover:scale-105"
                                                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                                        >
                                                            View Full Report →
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Previous Reports */}
                                <div className="surface-card rounded-xl p-5">
                                    <h2 className="text-lg font-semibold mb-4 text-white">Previous Scan Reports</h2>
                                    {reports.length > 0 ? (
                                        <div className="space-y-3">
                                            {reports.map(report => (
                                                <div key={report.id} 
                                                     className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                                                     style={{ background: 'var(--overlay-light)' }}
                                                     onClick={() => navigate(`/professor/plagiarism/report/${report.id}`)}>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-white">{report.exercise_title}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {new Date(report.created_at).toLocaleString()} · by {report.initiated_by_username}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-center">
                                                            <div className="text-sm font-bold" style={{ color: report.flagged_pairs > 0 ? '#ef4444' : '#22c55e' }}>
                                                                {report.flagged_pairs}
                                                            </div>
                                                            <div className="text-xs text-gray-500">Flagged</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-sm font-bold" style={{ color: getSeverityColor(parseFloat(report.max_similarity)) }}>
                                                                {parseFloat(report.max_similarity).toFixed(1)}%
                                                            </div>
                                                            <div className="text-xs text-gray-500">Max Sim.</div>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            report.status === 'completed' ? 'text-green-400 bg-green-500/10' : 
                                                            report.status === 'running' ? 'text-yellow-400 bg-yellow-500/10' : 
                                                            'text-red-400 bg-red-500/10'
                                                        }`}>
                                                            {report.status}
                                                        </span>
                                                        <span className="text-gray-500">→</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-4">
                                            No previous scans for this course. Run a scan on an exercise above.
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="surface-card rounded-xl p-12 text-center">
                                <div className="text-6xl mb-4">🔍</div>
                                <h2 className="text-xl font-semibold text-white mb-2">Select a Course</h2>
                                <p className="text-gray-400">
                                    Choose a course from the left panel to view exercises and run plagiarism scans.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlagiarismDashboard;
