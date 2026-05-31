import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseService } from '../services/api';

const getDifficultyBadgeClass = (difficulty) => {
    switch (difficulty) {
        case 'beginner': case 'easy':   return 'badge-beginner';
        case 'intermediate': case 'medium': return 'badge-intermediate';
        case 'advanced': case 'hard':   return 'badge-advanced';
        default: return 'badge-beginner';
    }
};

const ExerciseAttempts = () => {
    const { courseId, exerciseId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedStudent, setExpandedStudent] = useState(null);

    useEffect(() => {
        courseService.getExerciseStudentAttempts(courseId, exerciseId)
            .then(res => setData(res.data))
            .catch(err => console.error('Error loading exercise attempts:', err))
            .finally(() => setLoading(false));
    }, [courseId, exerciseId]);

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading attempts…</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-400">Could not load exercise data.</p>
            </div>
        );
    }

    const { exercise, students } = data;
    const passed = students.filter(s => s.completed).length;

    return (
        <div className="min-h-screen pt-24 pb-8 px-6">
            <div className="max-w-4xl mx-auto">

                {/* Back */}
                <Link
                    to={`/professor/course/${courseId}/students`}
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 no-underline"
                >
                    <span>←</span> Back to Students
                </Link>

                {/* Header */}
                <div className="surface-card rounded-2xl p-6 mb-6">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Exercise Performance</p>
                    <h1 className="text-2xl font-bold mb-3">{exercise.title}</h1>
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className={`badge ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                            {exercise.difficulty}
                        </span>
                        <span className="text-sm text-gray-400">{students.length} attempted</span>
                        <span className="text-sm text-gray-400">{passed} passed</span>
                        {students.length > 0 && (
                            <span className="text-sm text-gray-400">
                                {Math.round((passed / students.length) * 100)}% pass rate
                            </span>
                        )}
                    </div>
                </div>

                {/* Student list */}
                {students.length === 0 ? (
                    <div className="surface-card rounded-2xl p-12 text-center">
                        <p className="text-gray-400">No students have attempted this exercise yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {students.map((s) => (
                            <div key={s.user_id} className="surface-card rounded-xl overflow-hidden">

                                {/* Student summary row */}
                                <div
                                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedStudent(expandedStudent === s.user_id ? null : s.user_id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.completed ? 'bg-green-400' : 'bg-gray-500'}`} />
                                        <div>
                                            <p className="font-medium">{s.username}</p>
                                            <p className="text-xs text-gray-500">{s.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-gray-400">{s.attempts} attempt{s.attempts !== 1 ? 's' : ''}</p>
                                            {s.best_score > 0 && (
                                                <p className="text-green-400">{s.best_score}% best</p>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            s.completed
                                                ? 'bg-green-500/15 text-green-400'
                                                : 'bg-gray-500/15 text-gray-400'
                                        }`}>
                                            {s.completed ? 'Passed' : 'Not passed'}
                                        </span>
                                        <span className={`text-gray-500 text-xs transition-transform duration-200 ${
                                            expandedStudent === s.user_id ? 'rotate-180' : ''
                                        }`}>▼</span>
                                    </div>
                                </div>

                                {/* Code submissions */}
                                {expandedStudent === s.user_id && (
                                    <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-3">
                                        {(!s.submissions || s.submissions.length === 0) ? (
                                            <p className="text-xs text-gray-500">No submission code recorded.</p>
                                        ) : (
                                            s.submissions.map((sub, idx) => (
                                                <div key={sub.id} className="rounded-lg overflow-hidden border border-white/10">
                                                    {/* Submission meta bar */}
                                                    <div className="flex items-center justify-between px-3 py-2 bg-white/5 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">#{s.submissions.length - idx}</span>
                                                            <span className="font-mono text-gray-300 uppercase">{sub.language}</span>
                                                            <span className={sub.status === 'passed' ? 'text-green-400' : 'text-red-400'}>
                                                                {sub.status}
                                                            </span>
                                                            <span className="text-gray-500">{sub.tests_passed}/{sub.tests_total} tests</span>
                                                        </div>
                                                        <span className="text-gray-500">{formatDateTime(sub.submitted_at)}</span>
                                                    </div>
                                                    {/* Code */}
                                                    <pre className="text-xs font-mono text-gray-300 p-4 overflow-x-auto max-h-56 bg-black/40 leading-relaxed whitespace-pre-wrap break-words">
                                                        {sub.code}
                                                    </pre>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExerciseAttempts;
