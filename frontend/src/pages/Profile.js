import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authService, analyticsService, courseService } from '../services/api';
import PasswordInput, { PasswordStrengthBar } from '../components/PasswordInput';

const formatTime = (seconds) => {
    const s = Number(seconds) || 0;
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.round(s / 60)}m`;
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return `${h}h ${m}m`;
};

const StatCard = ({ label, value, color = '#fef483' }) => (
    <div className="surface-card rounded-2xl p-5 flex flex-col gap-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
    </div>
);

const Profile = () => {
    const { user, logout, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const isProfessor = user?.role === 'professor' || user?.role === 'admin';
    const accent = isProfessor ? '#a1609d' : '#fef483';

    // ── Staged edits (nothing is applied until Save is clicked) ──
    const [pendingBase64, setPendingBase64]   = useState(null);   // resized base64 data-URL
    const [pendingPreview, setPendingPreview] = useState(null);   // same value shown in <img>
    const [stagedUsername, setStagedUsername] = useState('');
    const [stagedCurrentPw, setStagedCurrentPw]   = useState('');
    const [stagedNewPw, setStagedNewPw]           = useState('');
    const [stagedConfirmPw, setStagedConfirmPw]   = useState('');

    // ── Save state ──
    const [saving, setSaving]     = useState(false);
    const [saveMsg, setSaveMsg]   = useState(null); // { type: 'error'|'success', text }

    // ── Stats ──
    const [stats, setStats]           = useState(null);
    const [recentSubs, setRecentSubs] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);

    // ── Delete account ──
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting]       = useState(false);
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        loadStats();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadStats = async () => {
        try {
            if (isProfessor) {
                const res = await courseService.getProfessorCourses();
                const courses = res.data || [];
                setStats({
                    coursesCreated: courses.length,
                    totalStudents: courses.reduce((s, c) => s + Number(c.enrollment_count || 0), 0),
                    totalExercises: courses.reduce((s, c) => s + Number(c.exercise_count || 0), 0),
                });
            } else {
                const [ovRes, recRes] = await Promise.all([
                    analyticsService.getOverview(),
                    analyticsService.getRecentSubmissions(),
                ]);
                setStats(ovRes.data);
                setRecentSubs((recRes.data || []).slice(0, 5));
            }
        } catch (_) {}
        setLoadingStats(false);
    };

    // Derived values
    const avatarSrc = pendingPreview || user?.avatar_url || null;

    const hasChanges = !!pendingBase64
        || stagedUsername.trim() !== ''
        || (!!stagedCurrentPw && !!stagedNewPw);

    // ── Handlers ──

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSaveMsg(null);
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 256;
                let { width, height } = img;
                if (width > height) {
                    if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
                } else {
                    if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/jpeg', 0.85);
                setPendingBase64(base64);
                setPendingPreview(base64);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleDiscard = () => {
        setPendingBase64(null);
        setPendingPreview(null);
        setStagedUsername('');
        setStagedCurrentPw('');
        setStagedNewPw('');
        setStagedConfirmPw('');
        setSaveMsg(null);
    };

    const handleSave = async () => {
        if (stagedNewPw && stagedNewPw !== stagedConfirmPw) {
            setSaveMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setSaving(true);
        setSaveMsg(null);
        const errors = [];

        // 1. Avatar
        if (pendingBase64) {
            try {
                const res = await authService.uploadAvatar(pendingBase64);
                updateUser({ avatar_url: res.data.avatarUrl });
                setPendingBase64(null);
                setPendingPreview(null);
            } catch (err) {
                errors.push(err.response?.data?.error || 'Avatar upload failed');
            }
        }

        // 2. Username
        if (stagedUsername.trim() && stagedUsername.trim() !== user.username) {
            try {
                const res = await authService.updateProfile({ username: stagedUsername.trim() });
                updateUser({ username: res.data.user.username });
                setStagedUsername('');
            } catch (err) {
                errors.push(err.response?.data?.error || 'Username update failed');
            }
        } else if (stagedUsername.trim()) {
            setStagedUsername(''); // same name, just clear
        }

        // 3. Password
        if (stagedCurrentPw && stagedNewPw) {
            try {
                await authService.updateProfile({
                    currentPassword: stagedCurrentPw,
                    newPassword: stagedNewPw,
                });
                setStagedCurrentPw('');
                setStagedNewPw('');
                setStagedConfirmPw('');
            } catch (err) {
                errors.push(err.response?.data?.error || 'Password update failed');
            }
        }

        setSaving(false);
        if (errors.length > 0) {
            setSaveMsg({ type: 'error', text: errors.join(' · ') });
        } else {
            setSaveMsg({ type: 'success', text: 'Changes saved!' });
            setTimeout(() => setSaveMsg(null), 3000);
        }
    };

    const handleDeleteAccount = async () => {
        if (confirmText !== 'DELETE') return;
        setDeleting(true);
        setDeleteError('');
        try {
            await authService.deleteAccount();
            logout();
            navigate('/');
        } catch (err) {
            setDeleteError(err.response?.data?.error || 'Failed to delete account');
            setDeleting(false);
        }
    };

    if (!user) return null;

    const joinDate = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="min-h-screen pt-28 pb-16 px-6" style={{ background: 'var(--bg-color)' }}>
            <div className="max-w-3xl mx-auto space-y-6">

                {/* ── Header card ── */}
                <div className="surface-card rounded-2xl p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="relative group">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full overflow-hidden border-2 cursor-pointer focus:outline-none relative block"
                                    style={{ borderColor: pendingBase64 ? '#fbbf24' : accent }}
                                    aria-label="Change profile picture"
                                >
                                    {avatarSrc ? (
                                        <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                                            style={{
                                                background: isProfessor
                                                    ? 'linear-gradient(135deg, #a1609d, #b88ab5)'
                                                    : 'linear-gradient(135deg, #fef483, #a1609d)',
                                            }}
                                        >
                                            {user.username?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                    </div>
                                </button>
                                {pendingBase64 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 border-2 border-[var(--bg-color)]" title="Unsaved" />
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                            <p className="text-gray-400 mt-1">{user.email}</p>
                            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-medium"
                                    style={{
                                        background: isProfessor ? 'rgba(161,96,157,0.2)' : 'rgba(254,244,131,0.2)',
                                        color: isProfessor ? '#b88ab5' : '#fef483',
                                    }}
                                >
                                    {isProfessor ? 'Professor' : 'Student'}
                                </span>
                                {joinDate && (
                                    <span className="px-3 py-1 rounded-full text-xs text-gray-400 bg-white/5">
                                        Joined {joinDate}
                                    </span>
                                )}
                            </div>
                        </div>

                        {!isProfessor && (
                            <Link
                                to="/my-analytics"
                                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium no-underline transition-opacity hover:opacity-80"
                                style={{ background: 'rgba(254,244,131,0.1)', color: '#fef483', border: '1px solid rgba(254,244,131,0.2)' }}
                            >
                                Full Analytics →
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Stats row ── */}
                {loadingStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[...Array(isProfessor ? 3 : 4)].map((_, i) => (
                            <div key={i} className="surface-card rounded-2xl p-5 h-20 animate-pulse" />
                        ))}
                    </div>
                ) : stats && (
                    isProfessor ? (
                        <div className="grid grid-cols-3 gap-4">
                            <StatCard label="Courses Created" value={stats.coursesCreated} color="#a1609d" />
                            <StatCard label="Total Students" value={stats.totalStudents} color="#b88ab5" />
                            <StatCard label="Exercises" value={stats.totalExercises} color="#a1609d" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatCard label="Enrolled Courses" value={stats.enrolled_courses ?? '—'} color="#fef483" />
                            <StatCard label="Exercises Done" value={stats.exercises_completed ?? '—'} color="#a1609d" />
                            <StatCard
                                label="Pass Rate"
                                value={stats.total_submissions > 0
                                    ? `${Math.round((stats.exercises_passed / stats.total_submissions) * 100)}%`
                                    : '—'}
                                color="#7ed957"
                            />
                            <StatCard label="Coding Time" value={formatTime(stats.total_time_spent)} color="#6dd5ed" />
                        </div>
                    )
                )}

                {/* ── Recent submissions (students) ── */}
                {!isProfessor && recentSubs.length > 0 && (
                    <div className="surface-card rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
                        <div className="space-y-2">
                            {recentSubs.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate">{sub.exercise_title}</p>
                                        <p className="text-xs text-gray-500 truncate">{sub.course_title}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                        <span
                                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                                            style={{
                                                background: sub.status === 'passed' ? 'rgba(126,217,87,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: sub.status === 'passed' ? '#7ed957' : '#ef4444',
                                            }}
                                        >
                                            {sub.status}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(sub.submitted_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Edit profile ── */}
                <div className="surface-card rounded-2xl p-6 space-y-6">
                    <h2 className="text-lg font-bold text-white">Edit Profile</h2>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Change Username
                            {stagedUsername.trim() && stagedUsername.trim() !== user.username && (
                                <span className="ml-2 text-xs text-yellow-400">unsaved</span>
                            )}
                        </label>
                        <input
                            type="text"
                            value={stagedUsername}
                            onChange={(e) => { setStagedUsername(e.target.value); setSaveMsg(null); }}
                            placeholder={user.username}
                            className="w-full"
                        />
                    </div>

                    {/* Password */}
                    <div className="pt-4 border-t border-white/10">
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Change Password
                            {stagedCurrentPw && stagedNewPw && (
                                <span className="ml-2 text-xs text-yellow-400">unsaved</span>
                            )}
                        </label>
                        <div className="space-y-3">
                            <PasswordInput
                                value={stagedCurrentPw}
                                onChange={(e) => { setStagedCurrentPw(e.target.value); setSaveMsg(null); }}
                                placeholder="Current password"
                                autoComplete="current-password"
                            />
                            <div>
                                <PasswordInput
                                    value={stagedNewPw}
                                    onChange={(e) => { setStagedNewPw(e.target.value); setSaveMsg(null); }}
                                    placeholder="New password"
                                    autoComplete="new-password"
                                />
                                <PasswordStrengthBar password={stagedNewPw} />
                            </div>
                            <PasswordInput
                                value={stagedConfirmPw}
                                onChange={(e) => { setStagedConfirmPw(e.target.value); setSaveMsg(null); }}
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    {/* Save / Discard bar */}
                    <div className="pt-4 border-t border-white/10 flex items-center gap-3 flex-wrap">
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none"
                            style={{ background: accent, color: isProfessor ? 'white' : '#1a1a2e' }}
                        >
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Saving…
                                </span>
                            ) : 'Save Changes'}
                        </button>

                        {hasChanges && !saving && (
                            <button
                                onClick={handleDiscard}
                                className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors border border-white/10 bg-transparent cursor-pointer"
                            >
                                Discard
                            </button>
                        )}

                        {saveMsg && (
                            <p className={`text-sm font-medium ${saveMsg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                {saveMsg.type === 'success' ? '✓ ' : ''}{saveMsg.text}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Danger Zone ── */}
                <div className="rounded-2xl p-6 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.05)' }}>
                    <h2 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h2>
                    <p className="text-gray-400 text-sm mb-5">
                        Permanently delete your account and all associated data. This cannot be undone.
                    </p>
                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-5 py-2.5 rounded-xl text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer bg-transparent font-medium text-sm"
                        >
                            Delete Account
                        </button>
                    ) : (
                        <div className="space-y-3 p-4 rounded-xl border border-red-500/30" style={{ background: 'rgba(239,68,68,0.08)' }}>
                            <p className="text-sm text-red-300">
                                Type <span className="font-mono bg-red-500/20 px-1.5 py-0.5 rounded">DELETE</span> to confirm.
                            </p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-red-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                                autoFocus
                            />
                            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={confirmText !== 'DELETE' || deleting}
                                    className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer border-none ${
                                        confirmText === 'DELETE' && !deleting
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {deleting ? 'Deleting…' : 'Permanently Delete'}
                                </button>
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setConfirmText(''); setDeleteError(''); }}
                                    className="px-5 py-2.5 rounded-xl text-gray-300 hover:bg-white/5 transition-colors border border-white/10 bg-transparent cursor-pointer font-medium text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Profile;
