import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { yearService } from '../services/api';

function schoolYearOptions() {
    const now = new Date();
    const y = now.getFullYear();
    // Before October we're still in the academic year that started the previous calendar year
    const academicStart = now.getMonth() < 9 ? y - 1 : y;
    return [academicStart - 1, academicStart, academicStart + 1].map(s => `${s}-${s + 1}`);
}

// Default start/end dates when a school year string is selected in the form
function defaultDatesForSchoolYear(sy) {
    const startYear = parseInt(sy.split('-')[0], 10);
    if (isNaN(startYear)) return { start_date: '', active_until: '' };
    return {
        start_date: `${startYear}-10-01`,
        active_until: `${startYear + 1}-07-31`,
    };
}

const YEAR_LABELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

export default function YearsClasses() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [years, setYears] = useState([]);
    const [expandedYears, setExpandedYears] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const [showYearModal, setShowYearModal] = useState(false);
    const [yearForm, setYearForm] = useState(() => {
        const sy = schoolYearOptions()[1];
        return { faculty: '', name: 'Year 1', school_year: sy, description: '', ...defaultDatesForSchoolYear(sy) };
    });
    const [yearFormError, setYearFormError] = useState('');
    const [yearSaving, setYearSaving] = useState(false);

    const [showClassModal, setShowClassModal] = useState(false);
    const [classForm, setClassForm] = useState({ name: '', description: '', year_id: null });
    const [classSaving, setClassSaving] = useState(false);
    const [classFormError, setClassFormError] = useState('');

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';
    const isStudent = user?.role === 'student';
    // Derive current school year label from whichever years the backend marked active
    const currentSchoolYear = years.find(y => y.is_current)?.school_year ?? schoolYearOptions()[1];

    useEffect(() => { fetchYears(); }, []);

    const fetchYears = async () => {
        try {
            setLoading(true);
            const res = await yearService.getYears();
            setYears(res.data);
        } catch {
            setError('Failed to load college years.');
        } finally {
            setLoading(false);
        }
    };

    const toggleYear = async (yearId) => {
        if (expandedYears[yearId]) {
            setExpandedYears(prev => ({ ...prev, [yearId]: null }));
            return;
        }
        try {
            const res = await yearService.getClassesByYear(yearId);
            setExpandedYears(prev => ({ ...prev, [yearId]: res.data }));
        } catch {
            setError('Failed to load classes.');
        }
    };

    const handleCreateYear = async (e) => {
        e.preventDefault();
        setYearFormError('');
        setYearSaving(true);
        try {
            await yearService.createYear(yearForm);
            setShowYearModal(false);
            const sy = schoolYearOptions()[1];
            setYearForm({ faculty: '', name: 'Year 1', school_year: sy, description: '', ...defaultDatesForSchoolYear(sy) });
            fetchYears();
        } catch (err) {
            setYearFormError(err.response?.data?.error || 'Failed to create year.');
        } finally {
            setYearSaving(false);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setClassFormError('');
        setClassSaving(true);
        try {
            await yearService.createClass(classForm.year_id, { name: classForm.name, description: classForm.description });
            setShowClassModal(false);
            setClassForm({ name: '', description: '', year_id: null });
            const res = await yearService.getClassesByYear(classForm.year_id);
            setExpandedYears(prev => ({ ...prev, [classForm.year_id]: res.data }));
        } catch (err) {
            setClassFormError(err.response?.data?.error || 'Failed to create class.');
        } finally {
            setClassSaving(false);
        }
    };

    const openAddClass = (yearId) => {
        setClassForm({ name: '', description: '', year_id: yearId });
        setClassFormError('');
        setShowClassModal(true);
    };

    // Split years into active vs archived
    const activeYears = years.filter(y => y.is_current);
    const archivedYears = years.filter(y => !y.is_current);

    // For students: in archive, only show years where they had at least one enrolled class
    const visibleArchivedYears = isStudent
        ? archivedYears.filter(y => (y.enrolled_class_ids || []).length > 0)
        : archivedYears;

    // Group by faculty
    const groupByFaculty = (list) => list.reduce((acc, y) => {
        const key = y.faculty || 'Uncategorised';
        if (!acc[key]) acc[key] = [];
        acc[key].push(y);
        return acc;
    }, {});

    const activeGrouped = groupByFaculty(activeYears);
    const archivedGrouped = groupByFaculty(visibleArchivedYears);

    const renderClasses = (_yearId, classes, year) => {
        if (!classes) return null;

        // For students viewing archived years: only show enrolled classes
        const visibleClasses = (isStudent && !year.is_current)
            ? classes.filter(c => (year.enrolled_class_ids || []).includes(c.id))
            : classes;

        return (
            <div className="border-t border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleClasses.length === 0 && (
                    <p className="text-gray-500 text-sm col-span-full">
                        {isProfessor
                            ? 'No classes yet. Click "+ Add Class" to create one.'
                            : 'No enrolled classes to show.'}
                    </p>
                )}
                {visibleClasses.map(cls => (
                    <button
                        key={cls.id}
                        onClick={() => navigate(`/class/${cls.id}`)}
                        className="text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#a1609d]/50 rounded-lg transition-all group"
                    >
                        <h3 className="font-medium text-white group-hover:text-[#b870ad] transition-colors">
                            {cls.name}
                        </h3>
                        {cls.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cls.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs text-gray-500">
                                {cls.course_count} course{cls.course_count !== 1 ? 's' : ''}
                            </p>
                            {cls.student_enrolled && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">
                                    Enrolled
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        );
    };

    const renderYearRow = (year, isArchive = false) => (
        <div key={year.id} className={`surface-card rounded-xl overflow-hidden ${isArchive ? 'opacity-75' : ''}`}>
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleYear(year.id)}
            >
                <div className="flex items-center gap-4">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                        style={{
                            background: isArchive
                                ? 'linear-gradient(135deg, #4b5563, #6b7280)'
                                : 'linear-gradient(135deg, #a1609d, #6366f1)',
                        }}
                    >
                        Y{year.name.match(/\d+/)?.[0] || '?'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{year.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isArchive
                                    ? 'bg-white/5 text-gray-500'
                                    : 'bg-[#a1609d]/20 text-[#c084bc]'
                            }`}>
                                {year.school_year}
                            </span>
                            {isArchive && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                                    Archived
                                </span>
                            )}
                        </div>
                        {year.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{year.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                        {year.class_count} class{year.class_count !== 1 ? 'es' : ''}
                    </span>
                    {isProfessor && (
                        <button
                            onClick={e => { e.stopPropagation(); openAddClass(year.id); }}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-200 text-xs rounded-lg transition-colors"
                        >
                            + Add Class
                        </button>
                    )}
                    <span className="text-gray-500 text-sm">
                        {expandedYears[year.id] ? '▲' : '▼'}
                    </span>
                </div>
            </div>

            {expandedYears[year.id] && renderClasses(year.id, expandedYears[year.id], year)}
        </div>
    );

    const renderFacultyGroup = (faculty, facultyYears, isArchive = false) => (
        <div key={faculty}>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className={isArchive ? 'text-gray-500' : 'text-[#a1609d]'}>🏛</span>
                <span className={isArchive ? 'text-gray-400' : ''}>{faculty}</span>
            </h2>
            <div className="space-y-3">
                {facultyYears.map(year => renderYearRow(year, isArchive))}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-400">Loading…</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">College Curriculum</h1>
                        <p className="text-gray-400 mt-1">
                            {currentSchoolYear} · Browse courses organised by faculty, year and subject
                        </p>
                    </div>
                    {isProfessor && (
                        <button
                            onClick={() => { setYearFormError(''); setShowYearModal(true); }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                        >
                            + Add Year
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-700/40 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Active years */}
                {activeYears.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-5xl mb-4">🎓</p>
                        <p className="text-lg">No active college years for {currentSchoolYear}.</p>
                        {isProfessor && (
                            <button
                                onClick={() => setShowYearModal(true)}
                                className="mt-4 px-4 py-2 rounded-lg text-sm text-white"
                                style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                            >
                                Create the first year
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(activeGrouped).map(([faculty, facultyYears]) =>
                            renderFacultyGroup(faculty, facultyYears, false)
                        )}
                    </div>
                )}

                {/* Archived section */}
                {visibleArchivedYears.length > 0 && (
                    <div className="mt-10">
                        <button
                            onClick={() => setShowArchived(v => !v)}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-4"
                        >
                            <svg
                                width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                className={`transition-transform ${showArchived ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                            {showArchived ? 'Hide' : 'Show'} archived years
                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-500 text-xs">
                                {visibleArchivedYears.length}
                            </span>
                        </button>

                        {showArchived && (
                            <div className="space-y-8 border-t border-white/5 pt-6">
                                {Object.entries(archivedGrouped).map(([faculty, facultyYears]) =>
                                    renderFacultyGroup(faculty, facultyYears, true)
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Year Modal */}
            {showYearModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="surface-card rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-5">Create College Year</h2>
                        <form onSubmit={handleCreateYear} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Faculty *</label>
                                <input
                                    type="text"
                                    value={yearForm.faculty}
                                    onChange={e => setYearForm(f => ({ ...f, faculty: e.target.value }))}
                                    placeholder="e.g. Computer Science"
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Year *</label>
                                    <select
                                        value={yearForm.name}
                                        onChange={e => setYearForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full"
                                    >
                                        {YEAR_LABELS.map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">School Year *</label>
                                    <select
                                        value={yearForm.school_year}
                                        onChange={e => {
                                            const sy = e.target.value;
                                            setYearForm(f => ({ ...f, school_year: sy, ...defaultDatesForSchoolYear(sy) }));
                                        }}
                                        className="w-full"
                                    >
                                        {schoolYearOptions().map(sy => (
                                            <option key={sy} value={sy}>{sy}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Start date *</label>
                                    <input
                                        type="date"
                                        value={yearForm.start_date}
                                        onChange={e => setYearForm(f => ({ ...f, start_date: e.target.value }))}
                                        required
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Active until *</label>
                                    <input
                                        type="date"
                                        value={yearForm.active_until}
                                        onChange={e => setYearForm(f => ({ ...f, active_until: e.target.value }))}
                                        required
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={yearForm.description}
                                    onChange={e => setYearForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Optional notes about this year group"
                                    rows={2}
                                    className="w-full resize-none"
                                />
                            </div>

                            {yearFormError && (
                                <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                                    {yearFormError}
                                </p>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowYearModal(false)}
                                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={yearSaving}
                                    className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                >
                                    {yearSaving ? 'Creating…' : 'Create Year'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Class Modal */}
            {showClassModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="surface-card rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-5">Add Class</h2>
                        <form onSubmit={handleCreateClass} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Class name *</label>
                                <input
                                    type="text"
                                    value={classForm.name}
                                    onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Data Structures"
                                    required
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={classForm.description}
                                    onChange={e => setClassForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Brief description of this subject"
                                    rows={2}
                                    className="w-full resize-none"
                                />
                            </div>

                            {classFormError && (
                                <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                                    {classFormError}
                                </p>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowClassModal(false)}
                                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={classSaving}
                                    className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                >
                                    {classSaving ? 'Adding…' : 'Add Class'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
