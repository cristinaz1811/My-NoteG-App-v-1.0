import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { classService } from '../services/api';

const STATUS_TABS = ['pending', 'approved', 'rejected'];

export default function EnrollmentRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');
    const [acting, setActing] = useState(null); // userId being approved/rejected

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await classService.getAllEnrollmentRequests(tab === 'all' ? undefined : tab);
            setRequests(res.data);
        } catch {
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (classId, userId) => {
        setActing(userId);
        try {
            await classService.approveEnrollment(classId, userId);
            setRequests(r => r.filter(x => !(x.class_id === classId && x.user_id === userId)));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to approve.');
        } finally {
            setActing(null);
        }
    };

    const handleReject = async (classId, userId) => {
        setActing(userId);
        try {
            await classService.rejectEnrollment(classId, userId);
            setRequests(r => r.filter(x => !(x.class_id === classId && x.user_id === userId)));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reject.');
        } finally {
            setActing(null);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="min-h-screen pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <Link to="/professor" className="text-sm text-gray-400 hover:text-white transition-colors no-underline">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold mt-4 mb-1">Enrollment Requests</h1>
                    <p className="text-gray-400">Review and manage student requests to join your classes.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {STATUS_TABS.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                                tab === t
                                    ? 'text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                            style={tab === t ? { background: 'linear-gradient(135deg, #a1609d, #b870ad)' } : {}}
                        >
                            {t}
                            {t === 'pending' && pendingCount > 0 && tab !== 'pending' && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#a1609d] text-white text-xs">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-16 text-gray-500">Loading…</div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-4xl mb-4">
                            {tab === 'pending' ? '📭' : tab === 'approved' ? '✅' : '❌'}
                        </p>
                        <p className="text-lg">No {tab} requests.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map(r => (
                            <div
                                key={`${r.class_id}-${r.user_id}`}
                                className="surface-card rounded-xl p-4 flex items-center gap-4"
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a1609d] to-[#6366f1] flex items-center justify-center text-white font-bold shrink-0">
                                    {r.student_name?.charAt(0).toUpperCase()}
                                </div>

                                {/* Student + class info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white truncate">{r.student_name}</p>
                                    <p className="text-xs text-gray-400 truncate">{r.student_email}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Link
                                            to={`/class/${r.class_id}`}
                                            className="text-xs text-[#b870ad] hover:underline no-underline"
                                        >
                                            {r.class_name}
                                        </Link>
                                        <span className="text-gray-600">·</span>
                                        <span className="text-xs text-gray-500">{r.faculty} — {r.year_name}</span>
                                        {r.school_year && (
                                            <>
                                                <span className="text-gray-600">·</span>
                                                <span className="text-xs text-gray-500">{r.school_year}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Date */}
                                <p className="text-xs text-gray-500 shrink-0 hidden sm:block">
                                    {new Date(r.enrolled_at).toLocaleDateString('en-GB', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                </p>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {r.status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleApprove(r.class_id, r.user_id)}
                                                disabled={acting === r.user_id}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors"
                                            >
                                                {acting === r.user_id ? '…' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleReject(r.class_id, r.user_id)}
                                                disabled={acting === r.user_id}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/10 hover:bg-red-900/40 hover:text-red-400 disabled:opacity-50 transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    ) : (
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                            r.status === 'approved'
                                                ? 'bg-green-900/30 text-green-400'
                                                : 'bg-red-900/30 text-red-400'
                                        }`}>
                                            {r.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
