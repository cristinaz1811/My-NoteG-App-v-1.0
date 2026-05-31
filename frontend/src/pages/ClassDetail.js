import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { classService, courseService } from '../services/api';

const GRADIENTS = [
    'from-orange-500 to-red-600', 'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600', 'from-green-500 to-emerald-600',
    'from-fuchsia-500 to-purple-600', 'from-amber-500 to-orange-600',
];
const EMOJIS = ['🌐', '🐍', '🤖', '📱', '⚛️', '🎨', '🔧', '📊'];

export default function ClassDetail() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [cls, setCls] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Enrollment state (student)
    const [enrollStatus, setEnrollStatus] = useState('none'); // none | pending | approved | rejected
    const [accessKey, setAccessKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [enrollError, setEnrollError] = useState('');
    const [enrolling, setEnrolling] = useState(false);

    // Requests panel (professor)
    const [requests, setRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [accessKeyDisplay, setAccessKeyDisplay] = useState('');
    const [keyVisible, setKeyVisible] = useState(false);

    // Assign-existing modal (professor)
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [allProfCourses, setAllProfCourses] = useState([]);
    const [assignSearch, setAssignSearch] = useState('');
    const [assigning, setAssigning] = useState(null);

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';

    const fetchClass = useCallback(async () => {
        try {
            setLoading(true);
            const res = await classService.getClassById(classId);
            setCls(res.data);
            if (res.data.access_key) setAccessKeyDisplay(res.data.access_key);
        } catch {
            setError('Failed to load class.');
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        fetchClass();
        if (user && !isProfessor) {
            classService.getEnrollmentStatus(classId)
                .then(r => setEnrollStatus(r.data.status))
                .catch(() => {});
        }
    }, [classId, user, isProfessor, fetchClass]);

    const loadRequests = async () => {
        setRequestsLoading(true);
        try {
            const res = await classService.getEnrollmentRequests(classId);
            setRequests(res.data);
        } catch {
            setRequests([]);
        } finally {
            setRequestsLoading(false);
        }
    };

    const toggleRequests = () => {
        if (!showRequests) loadRequests();
        setShowRequests(p => !p);
    };

    const handleRequestEnroll = async () => {
        setEnrollError('');
        setEnrolling(true);
        try {
            const res = await classService.requestEnrollment(classId, {});
            setEnrollStatus(res.data.status);
        } catch (err) {
            setEnrollError(err.response?.data?.error || 'Failed to send request.');
        } finally {
            setEnrolling(false);
        }
    };

    const handleEnrollWithKey = async (e) => {
        e.preventDefault();
        setEnrollError('');
        setEnrolling(true);
        try {
            const res = await classService.requestEnrollment(classId, { access_key: accessKey.trim().toUpperCase() });
            setEnrollStatus(res.data.status);
            setShowKeyInput(false);
            fetchClass();
        } catch (err) {
            setEnrollError(err.response?.data?.error || 'Invalid access key.');
        } finally {
            setEnrolling(false);
        }
    };

    const handleApprove = async (userId) => {
        try {
            await classService.approveEnrollment(classId, userId);
            setRequests(r => r.map(x => x.user_id === userId ? { ...x, status: 'approved' } : x));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to approve.');
        }
    };

    const handleReject = async (userId) => {
        try {
            await classService.rejectEnrollment(classId, userId);
            setRequests(r => r.map(x => x.user_id === userId ? { ...x, status: 'rejected' } : x));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reject.');
        }
    };

    const handleRegenerateKey = async () => {
        if (!window.confirm('Generate a new access key? The old key will stop working.')) return;
        try {
            const res = await classService.regenerateAccessKey(classId);
            setAccessKeyDisplay(res.data.access_key);
        } catch {
            alert('Failed to regenerate key.');
        }
    };

    const openAssignModal = async () => {
        try {
            const res = await courseService.getProfessorCourses();
            setAllProfCourses(res.data);
        } catch { setAllProfCourses([]); }
        setAssignSearch('');
        setShowAssignModal(true);
    };

    const handleAssign = async (courseId) => {
        setAssigning(courseId);
        try {
            await courseService.updateCourse(courseId, { class_id: parseInt(classId) });
            setShowAssignModal(false);
            fetchClass();
        } catch { alert('Failed to assign course.'); }
        finally { setAssigning(null); }
    };

    const handleUnassign = async (courseId) => {
        if (!window.confirm('Remove this course from the class?')) return;
        try {
            await courseService.updateCourse(courseId, { class_id: null });
            fetchClass();
        } catch { alert('Failed to remove course.'); }
    };

    // ─── render ────────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-gray-400">Loading…</div>
        </div>
    );

    if (error || !cls) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <p className="text-gray-400 mb-4">{error || 'Class not found'}</p>
                <button onClick={() => navigate('/years')} className="text-[#a1609d] underline">Back to Curriculum</button>
            </div>
        </div>
    );

    const assignedIds = new Set((cls.courses || []).map(c => c.id));
    const assignableCourses = allProfCourses.filter(c =>
        !assignedIds.has(c.id) &&
        (c.title.toLowerCase().includes(assignSearch.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(assignSearch.toLowerCase()))
    );
    const pendingCount = requests.filter(r => r.status === 'pending').length;

    const canSeeCourses = isProfessor || enrollStatus === 'approved';

    return (
        <div className="min-h-screen pt-24 pb-12 px-6">
            <div className="max-w-5xl mx-auto">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                    <Link to="/years" className="hover:text-white transition-colors no-underline">Curriculum</Link>
                    <span>/</span>
                    <span className="text-gray-300">{cls.faculty} — {cls.year_name}</span>
                    <span>/</span>
                    <span className="text-white font-medium">{cls.name}</span>
                </nav>

                {/* Header row */}
                <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">{cls.name}</h1>
                        {cls.description && <p className="text-gray-400">{cls.description}</p>}
                        <p className="text-sm text-gray-500 mt-1">
                            {cls.courses?.length || 0} course{cls.courses?.length !== 1 ? 's' : ''} · {cls.school_year}
                        </p>
                    </div>

                    {isProfessor && (
                        <div className="flex gap-3 shrink-0 flex-wrap">
                            <button
                                onClick={toggleRequests}
                                className="relative px-4 py-2 rounded-lg text-sm font-medium border border-white/20 text-gray-300 hover:bg-white/10 transition-colors"
                            >
                                Enrollment Requests
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#a1609d] text-white text-xs flex items-center justify-center">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={openAssignModal}
                                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#a1609d]/40 text-[#b870ad] hover:bg-[#a1609d]/10 transition-colors"
                            >
                                Assign Existing
                            </button>
                            <Link
                                to={`/professor/course/create?class=${classId}`}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white no-underline hover:opacity-90 transition-opacity"
                                style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                            >
                                + Create New Course
                            </Link>
                        </div>
                    )}
                </div>

                {/* ── Professor: Access key panel ── */}
                {isProfessor && (
                    <div className="surface-card rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-sm font-medium text-gray-300 mb-0.5">Class Access Key</p>
                            <p className="text-xs text-gray-500">Share this key with students so they can join without waiting for approval.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {accessKeyDisplay ? (
                                <>
                                    <span
                                        className="font-mono text-lg tracking-widest px-3 py-1 rounded-lg bg-white/10 text-white cursor-pointer select-all"
                                        onClick={() => setKeyVisible(v => !v)}
                                        title="Click to show/hide"
                                    >
                                        {keyVisible ? accessKeyDisplay : '••••••••'}
                                    </span>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(accessKeyDisplay); }}
                                        className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                                    >
                                        Copy
                                    </button>
                                </>
                            ) : (
                                <span className="text-sm text-gray-500">No key yet</span>
                            )}
                            <button
                                onClick={handleRegenerateKey}
                                className="px-3 py-1.5 rounded-lg text-xs border border-white/20 text-gray-400 hover:text-white transition-colors"
                            >
                                {accessKeyDisplay ? 'Regenerate' : 'Generate Key'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Professor: Enrollment requests panel ── */}
                {isProfessor && showRequests && (
                    <div className="surface-card rounded-xl p-5 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Enrollment Requests</h2>
                        {requestsLoading ? (
                            <p className="text-gray-500 text-sm">Loading…</p>
                        ) : requests.length === 0 ? (
                            <p className="text-gray-500 text-sm">No requests yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {requests.map(r => (
                                    <div key={r.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a1609d] to-[#6366f1] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                {r.username?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{r.username}</p>
                                                <p className="text-xs text-gray-400 truncate">{r.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {r.status === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(r.user_id)}
                                                        className="px-3 py-1 rounded-lg text-xs text-white bg-green-600 hover:bg-green-500 transition-colors"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(r.user_id)}
                                                        className="px-3 py-1 rounded-lg text-xs text-gray-300 bg-white/10 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`text-xs px-2 py-1 rounded-full ${
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
                )}

                {/* ── Student: enrollment gate ── */}
                {!isProfessor && enrollStatus !== 'approved' && (
                    <div className="surface-card rounded-2xl p-8 mb-8 text-center max-w-md mx-auto">
                        {enrollStatus === 'none' && (
                            <>
                                <p className="text-4xl mb-3">🎓</p>
                                <h2 className="text-xl font-bold text-white mb-2">Enroll in this Class</h2>
                                <p className="text-gray-400 text-sm mb-6">
                                    Request approval from the professor, or enter the class access key to join immediately.
                                </p>
                                {enrollError && (
                                    <p className="text-red-400 text-sm mb-4 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                                        {enrollError}
                                    </p>
                                )}
                                {showKeyInput ? (
                                    <form onSubmit={handleEnrollWithKey} className="space-y-3">
                                        <input
                                            type="text"
                                            value={accessKey}
                                            onChange={e => setAccessKey(e.target.value.toUpperCase())}
                                            placeholder="Enter access key…"
                                            className="w-full text-center font-mono text-xl tracking-widest uppercase"
                                            maxLength={20}
                                            autoFocus
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => { setShowKeyInput(false); setEnrollError(''); }}
                                                className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={enrolling || !accessKey.trim()}
                                                className="flex-1 px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50 transition-opacity hover:opacity-90"
                                                style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                            >
                                                {enrolling ? 'Joining…' : 'Join'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleRequestEnroll}
                                            disabled={enrolling}
                                            className="w-full px-4 py-2.5 rounded-lg text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                        >
                                            {enrolling ? 'Sending…' : 'Request Enrollment'}
                                        </button>
                                        <button
                                            onClick={() => { setShowKeyInput(true); setEnrollError(''); }}
                                            className="w-full px-4 py-2.5 rounded-lg text-sm text-[#b870ad] border border-[#a1609d]/30 hover:bg-[#a1609d]/10 transition-colors"
                                        >
                                            I have an access key
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {enrollStatus === 'pending' && (
                            <>
                                <p className="text-4xl mb-3">⏳</p>
                                <h2 className="text-xl font-bold text-white mb-2">Request Pending</h2>
                                <p className="text-gray-400 text-sm">
                                    Your enrollment request has been sent. You'll get access once the professor approves it.
                                </p>
                            </>
                        )}

                        {enrollStatus === 'rejected' && (
                            <>
                                <p className="text-4xl mb-3">❌</p>
                                <h2 className="text-xl font-bold text-white mb-2">Request Rejected</h2>
                                <p className="text-gray-400 text-sm mb-4">
                                    Your enrollment request was not approved. Contact your professor for more information.
                                </p>
                                <button
                                    onClick={() => { setShowKeyInput(true); setEnrollError(''); }}
                                    className="px-4 py-2 rounded-lg text-sm text-[#b870ad] border border-[#a1609d]/30 hover:bg-[#a1609d]/10 transition-colors"
                                >
                                    Try with access key
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* ── Course list (professors always, students only when approved) ── */}
                {canSeeCourses && (
                    <>
                        {(!cls.courses || cls.courses.length === 0) ? (
                            <div className="text-center py-20 text-gray-500">
                                <p className="text-5xl mb-4">📚</p>
                                <p className="text-lg mb-2">No courses in this class yet.</p>
                                {isProfessor && (
                                    <p className="text-sm text-gray-600">Use "Create New Course" or "Assign Existing" above.</p>
                                )}
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {cls.courses.map((course, i) => (
                                    <div
                                        key={course.id}
                                        className="surface-card card-hover cursor-pointer overflow-hidden group relative"
                                        onClick={() => isProfessor
                                            ? navigate(`/professor/course/${course.id}`)
                                            : navigate(`/my-courses/${course.id}`)
                                        }
                                    >
                                        <div className={`h-28 flex items-center justify-center bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                                            <span className="text-4xl transform group-hover:scale-110 transition-transform">
                                                {EMOJIS[i % EMOJIS.length]}
                                            </span>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`badge badge-${course.difficulty}`}>{course.difficulty}</span>
                                                {course.is_private && <span className="badge bg-[#a1609d]/20 text-[#a1609d]">🔒</span>}
                                            </div>
                                            <h3 className="font-semibold text-white mb-1 group-hover:text-[#fef483] transition-colors">
                                                {course.title}
                                            </h3>
                                            <p className="text-gray-400 text-sm line-clamp-2">{course.description}</p>
                                            <p className="text-xs text-gray-500 mt-3">by {course.professor_name}</p>
                                        </div>
                                        {isProfessor && (
                                            <button
                                                onClick={e => { e.stopPropagation(); handleUnassign(course.id); }}
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-gray-400 hover:text-red-400 hover:bg-black/70 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove from class"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Assign Existing Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="surface-card rounded-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">Assign Existing Course</h2>
                                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                            </div>
                            <input
                                type="text" value={assignSearch}
                                onChange={e => setAssignSearch(e.target.value)}
                                placeholder="Search your courses…" className="w-full" autoFocus
                            />
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 space-y-2">
                            {assignableCourses.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">
                                    {allProfCourses.length === 0 ? 'You have no courses yet.' : 'All your courses are already in this class.'}
                                </p>
                            ) : assignableCourses.map(course => (
                                <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{course.title}</p>
                                        <p className="text-xs text-gray-400 truncate">{course.description}</p>
                                        {course.class_name && (
                                            <p className="text-xs text-yellow-500 mt-0.5">Currently in: {course.class_name}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleAssign(course.id)}
                                        disabled={assigning === course.id}
                                        className="ml-3 shrink-0 px-3 py-1.5 rounded-lg text-sm text-white disabled:opacity-50 hover:opacity-90"
                                        style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                    >
                                        {assigning === course.id ? '…' : 'Assign'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
