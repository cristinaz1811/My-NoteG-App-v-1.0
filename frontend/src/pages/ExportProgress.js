import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { courseService, exportService } from '../services/api';

const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

const ExportProgress = () => {
    const { user } = useContext(AuthContext);
    const isProfessor = user?.role === 'professor' || user?.role === 'admin';

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState({});

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            if (isProfessor) {
                const res = await courseService.getProfessorCourses();
                setCourses(res.data);
            } else {
                const res = await courseService.getUserCourses();
                setCourses(res.data);
            }
        } catch (err) {
            console.error('Error loading courses:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Professor: export course grades ──
    const handleExportCourseGrades = async (courseId, courseTitle, format) => {
        const key = `course-${courseId}-${format}`;
        setExporting(prev => ({ ...prev, [key]: true }));
        try {
            const res = format === 'csv'
                ? await exportService.exportCourseGradesCSV(courseId)
                : await exportService.exportCourseGradesPDF(courseId);
            const ext = format === 'csv' ? 'csv' : 'pdf';
            downloadBlob(new Blob([res.data]), `${courseTitle.replace(/[^a-z0-9]/gi, '_')}_grades.${ext}`);
        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(prev => ({ ...prev, [key]: false }));
        }
    };

    // ── Student: export own progress ──
    const handleExportMyProgress = async (format) => {
        const key = `my-${format}`;
        setExporting(prev => ({ ...prev, [key]: true }));
        try {
            const res = format === 'csv'
                ? await exportService.exportMyProgressCSV()
                : await exportService.exportMyProgressPDF();
            const ext = format === 'csv' ? 'csv' : 'pdf';
            downloadBlob(new Blob([res.data]), `my_progress.${ext}`);
        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(prev => ({ ...prev, [key]: false }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                        style={{ borderColor: isProfessor ? '#a1609d' : '#fef483', borderTopColor: 'transparent' }}
                    ></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  PROFESSOR VIEW
    // ═════════════════════════════════════════════════════════════════════════
    if (isProfessor) {
        return (
            <div className="min-h-screen px-6 py-12">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-white mb-2">📊 Export Progress</h1>
                        <p className="text-gray-400">Download student grades as PDF or CSV for any of your courses.</p>
                    </div>

                    {courses.length === 0 ? (
                        <div className="surface-card rounded-2xl p-12 text-center">
                            <p className="text-5xl mb-4">📭</p>
                            <p className="text-gray-400">You don't have any courses yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-5">
                            {courses.map(course => {
                                const csvKey = `course-${course.id}-csv`;
                                const pdfKey = `course-${course.id}-pdf`;
                                return (
                                    <div key={course.id} className="surface-card rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-white truncate">{course.title}</h3>
                                            <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-400">
                                                {course.student_count !== undefined && (
                                                    <span>👥 {course.student_count} students</span>
                                                )}
                                                {course.exercise_count !== undefined && (
                                                    <span>📝 {course.exercise_count} exercises</span>
                                                )}
                                                <span className={`badge-${course.difficulty || 'beginner'} px-2 py-0.5 rounded-full text-xs font-medium`}>
                                                    {course.difficulty || 'beginner'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleExportCourseGrades(course.id, course.title, 'csv')}
                                                disabled={exporting[csvKey]}
                                                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-1.5"
                                                style={{ background: 'rgba(161, 96, 157, 0.15)', color: '#d4a5d1', border: '1px solid rgba(161, 96, 157, 0.3)' }}
                                            >
                                                {exporting[csvKey] ? (
                                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span>📄</span>
                                                )}
                                                CSV
                                            </button>
                                            <button
                                                onClick={() => handleExportCourseGrades(course.id, course.title, 'pdf')}
                                                disabled={exporting[pdfKey]}
                                                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-1.5"
                                                style={{ background: 'rgba(161, 96, 157, 0.15)', color: '#d4a5d1', border: '1px solid rgba(161, 96, 157, 0.3)' }}
                                            >
                                                {exporting[pdfKey] ? (
                                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span>📑</span>
                                                )}
                                                PDF
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  STUDENT VIEW
    // ═════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen px-6 py-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">📊 Export My Progress</h1>
                    <p className="text-gray-400">Download a report of your progress across all enrolled courses.</p>
                </div>

                {/* Export card */}
                <div className="surface-card rounded-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
                             style={{ background: 'linear-gradient(135deg, rgba(254, 244, 131, 0.15), rgba(161, 96, 157, 0.15))' }}>
                            📋
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-1">Your Progress Report</h2>
                        <p className="text-gray-400 text-sm">
                            Includes all enrolled courses, exercise scores, completion status, and time spent.
                        </p>
                    </div>

                    {courses.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm">You're not enrolled in any courses yet.</p>
                    ) : (
                        <>
                            {/* Course summary */}
                            <div className="mb-6 space-y-2">
                                <p className="text-sm text-gray-400 font-medium">Enrolled courses ({courses.length}):</p>
                                <div className="flex flex-wrap gap-2">
                                    {courses.map(c => (
                                        <span key={c.course_id || c.id} className="px-3 py-1 rounded-full text-xs font-medium"
                                            style={{ background: 'rgba(254, 244, 131, 0.1)', color: '#fef483', border: '1px solid rgba(254, 244, 131, 0.2)' }}>
                                            {c.course_title || c.title}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Export buttons */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => handleExportMyProgress('csv')}
                                    disabled={exporting['my-csv']}
                                    className="flex-1 px-6 py-3.5 rounded-xl font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                    style={{ background: 'rgba(254, 244, 131, 0.1)', color: '#fef483', border: '1px solid rgba(254, 244, 131, 0.3)' }}
                                >
                                    {exporting['my-csv'] ? (
                                        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span>📄</span>
                                    )}
                                    Export as CSV
                                </button>
                                <button
                                    onClick={() => handleExportMyProgress('pdf')}
                                    disabled={exporting['my-pdf']}
                                    className="flex-1 px-6 py-3.5 rounded-xl font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                    style={{ background: 'rgba(254, 244, 131, 0.1)', color: '#fef483', border: '1px solid rgba(254, 244, 131, 0.3)' }}
                                >
                                    {exporting['my-pdf'] ? (
                                        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span>📑</span>
                                    )}
                                    Export as PDF
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportProgress;
