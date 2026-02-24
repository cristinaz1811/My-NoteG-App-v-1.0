import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { analyticsService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';

const COLORS = ['#a1609d', '#fef483', '#b88ab5', '#6dd5ed', '#f6a623', '#7ed957'];
const DIFFICULTY_COLORS = { easy: '#7ed957', medium: '#f6a623', hard: '#ef4444' };

/* ────────── tiny helpers ────────── */
const formatTime = (seconds) => {
    const s = Number(seconds) || 0;
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.round(s / 60)}m`;
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return `${h}h ${m}m`;
};

const StatCard = ({ icon, label, value, sub, color = '#fef483' }) => (
    <div className="surface-card rounded-2xl p-5 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{icon}</span> {label}
        </div>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
);

const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>
);

/* ── custom recharts tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="surface-card rounded-lg px-3 py-2 shadow-xl border border-white/10 text-sm">
            <p className="font-medium text-white mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || p.fill }}>
                    {p.name}: <span className="font-semibold">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

/* ===================================================================
   MAIN COMPONENT
   =================================================================== */
const StudentAnalytics = () => {
    const { user } = useContext(AuthContext);

    const [overview, setOverview] = useState(null);
    const [progressData, setProgressData] = useState([]);
    const [coursePerf, setCoursePerf] = useState([]);
    const [diffBreakdown, setDiffBreakdown] = useState([]);
    const [langStats, setLangStats] = useState([]);
    const [recentSubs, setRecentSubs] = useState([]);
    const [timeCourse, setTimeCourse] = useState([]);
    const [aiFeedback, setAiFeedback] = useState(null);

    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    /* ── initial data fetch ── */
    useEffect(() => {
        const load = async () => {
            try {
                const [ov, prog, cp, diff, lang, rec, tc] = await Promise.all([
                    analyticsService.getOverview(),
                    analyticsService.getProgressOverTime(),
                    analyticsService.getCoursePerformance(),
                    analyticsService.getDifficultyBreakdown(),
                    analyticsService.getLanguageStats(),
                    analyticsService.getRecentSubmissions(),
                    analyticsService.getTimePerCourse(),
                ]);
                setOverview(ov.data);
                setProgressData(prog.data);
                setCoursePerf(cp.data);
                setDiffBreakdown(diff.data);
                setLangStats(lang.data);
                setRecentSubs(rec.data);
                setTimeCourse(tc.data);
            } catch (err) {
                console.error('Failed to load analytics', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    /* ── AI feedback request ── */
    const requestAIFeedback = async () => {
        setAiLoading(true);
        try {
            const res = await analyticsService.getAIFeedback();
            setAiFeedback(res.data.feedback);
        } catch (err) {
            console.error('AI feedback error', err);
        } finally {
            setAiLoading(false);
        }
    };

    /* ── spinner ── */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#fef483] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading your analytics...</p>
                </div>
            </div>
        );
    }

    /* ── no data guard ── */
    if (!overview || Number(overview.total_submissions) === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-6">📊</div>
                    <h1 className="text-2xl font-bold text-white mb-3">No Analytics Yet</h1>
                    <p className="text-gray-400 mb-6">Start solving exercises in your enrolled courses to see your progress and analytics here.</p>
                    <Link to="/courses" className="inline-block px-6 py-3 rounded-xl font-semibold gradient-bg text-white no-underline hover:opacity-90">Browse Courses</Link>
                </div>
            </div>
        );
    }

    /* ── prepare chart data ── */
    const diffPieData = diffBreakdown.map(d => ({
        name: d.difficulty?.charAt(0).toUpperCase() + d.difficulty?.slice(1),
        value: Number(d.completed) || 0,
        total: Number(d.total_exercises) || 0,
        color: DIFFICULTY_COLORS[d.difficulty] || '#a1609d',
    }));

    const langPieData = langStats.map((l, i) => ({
        name: l.language,
        value: Number(l.total_submissions),
        color: COLORS[i % COLORS.length],
    }));

    const courseBars = coursePerf.map(c => ({
        name: c.course_title.length > 18 ? c.course_title.slice(0, 18) + '…' : c.course_title,
        'Avg Score': Number(c.avg_score) || 0,
        'Progress %': Number(c.progress) || 0,
    }));

    const tabs = [
        { key: 'overview', label: '📊 Overview' },
        { key: 'courses', label: '📚 Courses' },
        { key: 'activity', label: '📈 Activity' },
        { key: 'ai', label: '🤖 AI Coach' },
    ];

    return (
        <div className="min-h-screen px-4 sm:px-6 py-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
                    My Analytics
                </h1>
                <p className="text-gray-400">
                    Track your learning journey, {user?.username || 'Student'}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border-none cursor-pointer ${
                            activeTab === t.key
                                ? 'text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                        }`}
                        style={activeTab === t.key ? { background: 'linear-gradient(135deg, #a1609d, #b88ab5)' } : { background: 'var(--card-bg)' }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─────── OVERVIEW TAB ─────── */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-slideUp">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon="📚" label="Courses Enrolled" value={overview.enrolled_courses} />
                        <StatCard icon="✅" label="Exercises Completed" value={overview.exercises_completed} color="#7ed957" />
                        <StatCard icon="📝" label="Total Submissions" value={overview.total_submissions} color="#6dd5ed" />
                        <StatCard icon="⭐" label="Average Score" value={`${Number(overview.average_score).toFixed(1)}%`} color="#f6a623" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon="⏱️" label="Total Study Time" value={formatTime(overview.total_time_spent)} color="#b88ab5" />
                        <StatCard icon="🏆" label="Exercises Passed" value={overview.exercises_passed} color="#7ed957" />
                        <StatCard icon="🎯" label="Pass Rate" value={Number(overview.total_submissions) > 0 ? `${((Number(overview.exercises_passed) / Number(overview.total_submissions)) * 100).toFixed(0)}%` : '—'} color="#fef483" />
                        <StatCard icon="💪" label="Difficulty Levels" value={diffBreakdown.length} sub="attempted" color="#a1609d" />
                    </div>

                    {/* Difficulty pie + language pie side by side */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Difficulty */}
                        <div className="surface-card rounded-2xl p-6">
                            <SectionHeader title="Exercises by Difficulty" subtitle="Completed vs total" />
                            {diffPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={diffPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value, total }) => `${name}: ${value}/${total}`}>
                                            {diffPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="text-gray-500 text-center py-12">No data yet</p>}
                        </div>

                        {/* Languages */}
                        <div className="surface-card rounded-2xl p-6">
                            <SectionHeader title="Languages Used" subtitle="Submissions per language" />
                            {langPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={langPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                                            {langPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="text-gray-500 text-center py-12">No data yet</p>}
                        </div>
                    </div>

                    {/* Difficulty detail table */}
                    <div className="surface-card rounded-2xl p-6">
                        <SectionHeader title="Strengths & Weaknesses" subtitle="Performance breakdown by difficulty level" />
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-400 border-b border-white/10">
                                        <th className="text-left py-3 px-2">Difficulty</th>
                                        <th className="text-center py-3 px-2">Completed</th>
                                        <th className="text-center py-3 px-2">Avg Score</th>
                                        <th className="text-center py-3 px-2">Avg Attempts</th>
                                        <th className="text-left py-3 px-2">Assessment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {diffBreakdown.map((d, i) => {
                                        const score = Number(d.avg_score) || 0;
                                        const attempts = Number(d.avg_attempts) || 0;
                                        let assessment = '—';
                                        let aColor = '#6b7280';
                                        if (d.completed > 0) {
                                            if (score >= 80 && attempts <= 2) { assessment = '💪 Strong'; aColor = '#7ed957'; }
                                            else if (score >= 60) { assessment = '👍 Good'; aColor = '#fef483'; }
                                            else { assessment = '📖 Needs Practice'; aColor = '#f6a623'; }
                                        }
                                        return (
                                            <tr key={i} className="border-b border-white/5">
                                                <td className="py-3 px-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: `${DIFFICULTY_COLORS[d.difficulty]}22`, color: DIFFICULTY_COLORS[d.difficulty] }}>
                                                        {d.difficulty?.charAt(0).toUpperCase() + d.difficulty?.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="text-center py-3 px-2 text-white">{d.completed}/{d.total_exercises}</td>
                                                <td className="text-center py-3 px-2 text-white">{score.toFixed(1)}%</td>
                                                <td className="text-center py-3 px-2 text-white">{attempts.toFixed(1)}</td>
                                                <td className="py-3 px-2 font-medium" style={{ color: aColor }}>{assessment}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────── COURSES TAB ─────── */}
            {activeTab === 'courses' && (
                <div className="space-y-8 animate-slideUp">
                    {/* Course bar chart */}
                    {courseBars.length > 0 && (
                        <div className="surface-card rounded-2xl p-6">
                            <SectionHeader title="Course Scores" subtitle="Average score and progress per course" />
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={courseBars} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} angle={-20} textAnchor="end" />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                                    <Bar dataKey="Avg Score" fill="#a1609d" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="Progress %" fill="#fef483" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Time per course */}
                    {timeCourse.length > 0 && (
                        <div className="surface-card rounded-2xl p-6">
                            <SectionHeader title="Time Spent per Course" subtitle="Study time distribution" />
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={timeCourse.map(t => ({ name: t.course_title.length > 20 ? t.course_title.slice(0, 20) + '…' : t.course_title, minutes: Math.round(Number(t.total_time_spent) / 60) }))} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} angle={-20} textAnchor="end" />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="minutes" fill="#b88ab5" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Course cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {coursePerf.map((c, i) => {
                            const pct = Number(c.exercises_total) > 0 ? Math.round((Number(c.exercises_completed) / Number(c.exercises_total)) * 100) : 0;
                            return (
                                <div key={i} className="surface-card rounded-2xl p-5 card-hover">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-white text-lg">{c.course_title}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${DIFFICULTY_COLORS[c.difficulty] || '#a1609d'}22`, color: DIFFICULTY_COLORS[c.difficulty] || '#a1609d' }}>
                                                {c.difficulty}
                                            </span>
                                        </div>
                                        <span className="text-2xl font-bold" style={{ color: pct >= 80 ? '#7ed957' : pct >= 40 ? '#fef483' : '#f6a623' }}>{pct}%</span>
                                    </div>
                                    {/* progress bar */}
                                    <div className="w-full h-2 rounded-full bg-white/10 mb-3 overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #a1609d, #fef483)' }} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-400">
                                        <div><span className="block text-white font-medium">{c.exercises_completed}/{c.exercises_total}</span>Exercises</div>
                                        <div><span className="block text-white font-medium">{Number(c.avg_score).toFixed(0)}%</span>Avg Score</div>
                                        <div><span className="block text-white font-medium">{formatTime(c.total_time_spent)}</span>Time</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─────── ACTIVITY TAB ─────── */}
            {activeTab === 'activity' && (
                <div className="space-y-8 animate-slideUp">
                    {/* Submission timeline */}
                    {progressData.length > 0 && (
                        <div className="surface-card rounded-2xl p-6">
                            <SectionHeader title="Submission Activity" subtitle="Daily submissions over the last 90 days" />
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={progressData.map(d => ({ ...d, day: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradPassed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#7ed957" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#7ed957" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                                    <Area type="monotone" dataKey="passed" stroke="#7ed957" fill="url(#gradPassed)" name="Passed" />
                                    <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#gradFailed)" name="Failed" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Average score trend */}
                    {progressData.length > 0 && (
                        <div className="surface-card rounded-2xl p-6">
                            <SectionHeader title="Score Trend" subtitle="Average daily score" />
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={progressData.map(d => ({ ...d, day: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), avg_score: Number(d.avg_score) }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="avg_score" stroke="#fef483" strokeWidth={2} dot={{ fill: '#fef483', r: 3 }} name="Avg Score" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Recent submissions table */}
                    <div className="surface-card rounded-2xl p-6">
                        <SectionHeader title="Recent Submissions" subtitle="Your latest 20 submissions" />
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-400 border-b border-white/10">
                                        <th className="text-left py-3 px-2">Exercise</th>
                                        <th className="text-left py-3 px-2">Course</th>
                                        <th className="text-center py-3 px-2">Difficulty</th>
                                        <th className="text-center py-3 px-2">Status</th>
                                        <th className="text-center py-3 px-2">Score</th>
                                        <th className="text-center py-3 px-2">Tests</th>
                                        <th className="text-right py-3 px-2">When</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSubs.map((s, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-2">
                                                <Link to={`/exercises/${s.exercise_id}`} className="text-[#fef483] hover:underline no-underline font-medium">
                                                    {s.exercise_title}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-2 text-gray-300">{s.course_title}</td>
                                            <td className="text-center py-3 px-2">
                                                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: `${DIFFICULTY_COLORS[s.difficulty] || '#a1609d'}22`, color: DIFFICULTY_COLORS[s.difficulty] || '#a1609d' }}>
                                                    {s.difficulty}
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'passed' ? 'bg-green-500/20 text-green-400' : s.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-2 text-white font-medium">{s.score != null ? `${s.score}%` : '—'}</td>
                                            <td className="text-center py-3 px-2 text-gray-300">{s.tests_passed}/{s.tests_total}</td>
                                            <td className="text-right py-3 px-2 text-gray-500 text-xs">{new Date(s.submitted_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {recentSubs.length === 0 && (
                                        <tr><td colSpan={7} className="text-center py-8 text-gray-500">No submissions yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Language stats bar chart */}
                    {langStats.length > 0 && (
                        <div className="surface-card rounded-2xl p-6">
                            <SectionHeader title="Language Performance" subtitle="Pass rate and score by language" />
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={langStats.map(l => ({ name: l.language, 'Pass Rate': Number(l.total_submissions) > 0 ? Math.round((Number(l.passed) / Number(l.total_submissions)) * 100) : 0, 'Avg Score': Number(l.avg_score) || 0 }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                                    <Bar dataKey="Pass Rate" fill="#7ed957" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="Avg Score" fill="#6dd5ed" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ─────── AI COACH TAB ─────── */}
            {activeTab === 'ai' && (
                <div className="space-y-8 animate-slideUp">
                    <div className="surface-card rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, rgba(161, 96, 157, 0.2), rgba(254, 244, 131, 0.2))' }}>
                                🤖
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">AI Learning Coach</h2>
                                <p className="text-sm text-gray-400">Personalised feedback powered by AI analysis of your performance data</p>
                            </div>
                        </div>

                        {!aiFeedback && (
                            <div className="text-center py-8">
                                <p className="text-gray-400 mb-4">Click the button below to get personalized AI feedback on your progress, strengths, and areas for improvement.</p>
                                <button
                                    onClick={requestAIFeedback}
                                    disabled={aiLoading}
                                    className="px-6 py-3 rounded-xl font-semibold text-white border-none cursor-pointer transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg, #a1609d, #b88ab5)' }}
                                >
                                    {aiLoading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Analysing your data...
                                        </span>
                                    ) : '✨ Get AI Feedback'}
                                </button>
                            </div>
                        )}

                        {aiFeedback && (
                            <div className="space-y-6 mt-4">
                                {/* Summary */}
                                <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(161, 96, 157, 0.1), rgba(254, 244, 131, 0.1))', border: '1px solid rgba(161, 96, 157, 0.2)' }}>
                                    <h3 className="font-semibold text-white mb-2">📋 Summary</h3>
                                    <p className="text-gray-300 leading-relaxed">{aiFeedback.summary}</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    {/* Strengths */}
                                    <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                                        <h3 className="font-semibold text-green-400 mb-3">💪 Strengths</h3>
                                        <ul className="space-y-2">
                                            {aiFeedback.strengths?.map((s, i) => (
                                                <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                                                    <span className="text-green-400 mt-0.5">✓</span> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Weaknesses */}
                                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                                        <h3 className="font-semibold text-orange-400 mb-3">📖 Areas to Improve</h3>
                                        <ul className="space-y-2">
                                            {aiFeedback.weaknesses?.map((w, i) => (
                                                <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                                                    <span className="text-orange-400 mt-0.5">!</span> {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Recommendations */}
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                                    <h3 className="font-semibold text-blue-400 mb-3">🎯 Recommendations</h3>
                                    <ul className="space-y-2">
                                        {aiFeedback.recommendations?.map((r, i) => (
                                            <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                                                <span className="text-blue-400 font-bold mt-0.5">{i + 1}.</span> {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Next steps */}
                                <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(254, 244, 131, 0.08), rgba(161, 96, 157, 0.08))', border: '1px solid rgba(254, 244, 131, 0.2)' }}>
                                    <h3 className="font-semibold mb-2" style={{ color: '#fef483' }}>🚀 Next Steps</h3>
                                    <p className="text-gray-300 leading-relaxed">{aiFeedback.nextSteps}</p>
                                </div>

                                {/* Refresh button */}
                                <div className="text-center pt-2">
                                    <button
                                        onClick={requestAIFeedback}
                                        disabled={aiLoading}
                                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 border border-white/10 bg-transparent cursor-pointer hover:bg-white/5 transition-all disabled:opacity-50"
                                    >
                                        {aiLoading ? 'Refreshing...' : '🔄 Refresh Feedback'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentAnalytics;
