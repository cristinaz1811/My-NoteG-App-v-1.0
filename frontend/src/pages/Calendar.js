import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { calendarService, courseService } from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const EVENT_COLORS = {
    deadline: '#ef4444',
    live_session: '#8b5cf6',
    reminder: '#f59e0b',
    custom: '#06b6d4',
};

const EVENT_LABELS = {
    deadline: 'Deadline',
    live_session: 'Live Session',
    reminder: 'Reminder',
    custom: 'Custom',
};

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}
function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function toLocalDatetimeStr(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

// ── Calendar Component ──────────────────────────────────────────────────

const Calendar = () => {
    const { user } = useContext(AuthContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
    const [filterType, setFilterType] = useState('all');
    const [exportMenuOpen, setExportMenuOpen] = useState(null); // eventId

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';

    // Form state
    const [form, setForm] = useState({
        title: '',
        description: '',
        event_type: 'reminder',
        start_time: '',
        end_time: '',
        all_day: false,
        color: '',
        course_id: '',
        reminder_minutes: 30,
        recurrence: '',
        is_course_event: false,
    });

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            // Fetch a wider window for week view spanning month boundary
            const queryStart = new Date(monthStart);
            queryStart.setDate(queryStart.getDate() - 7);
            const queryEnd = new Date(monthEnd);
            queryEnd.setDate(queryEnd.getDate() + 7);

            const params = {
                start: queryStart.toISOString(),
                end: queryEnd.toISOString(),
            };
            if (filterType !== 'all') params.type = filterType;

            const res = await calendarService.getEvents(params);
            setEvents(res.data);
        } catch (err) {
            console.error('Failed to load events:', err);
        } finally {
            setLoading(false);
        }
    }, [currentDate, filterType]);

    const fetchCourses = useCallback(async () => {
        try {
            const res = isProfessor
                ? await courseService.getProfessorCourses()
                : await courseService.getUserCourses();
            setCourses(res.data.courses || res.data || []);
        } catch (err) {
            console.error('Failed to load courses:', err);
        }
    }, [isProfessor]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);
    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    // ── Navigation ──────────────────────────────────────────────────────

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToday = () => setCurrentDate(new Date());

    // ── CRUD handlers ────────────────────────────────────────────────────

    const openNewEvent = (date) => {
        const d = date || new Date();
        setEditingEvent(null);
        setForm({
            title: '',
            description: '',
            event_type: 'reminder',
            start_time: toLocalDatetimeStr(d),
            end_time: toLocalDatetimeStr(new Date(d.getTime() + 3600000)),
            all_day: false,
            color: '',
            course_id: '',
            reminder_minutes: 30,
            recurrence: '',
            is_course_event: false,
        });
        setShowModal(true);
    };

    const openEditEvent = (event) => {
        setEditingEvent(event);
        setForm({
            title: event.title,
            description: event.description || '',
            event_type: event.event_type,
            start_time: toLocalDatetimeStr(event.start_time),
            end_time: event.end_time ? toLocalDatetimeStr(event.end_time) : '',
            all_day: event.all_day || false,
            color: event.color || '',
            course_id: event.course_id || '',
            reminder_minutes: event.reminder_minutes || 30,
            recurrence: event.recurrence || '',
            is_course_event: false,
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                course_id: form.course_id || null,
                color: form.color || EVENT_COLORS[form.event_type],
                recurrence: form.recurrence || null,
            };

            if (editingEvent) {
                await calendarService.updateEvent(editingEvent.id, payload);
            } else if (form.is_course_event && isProfessor) {
                await calendarService.createCourseEvent(payload);
            } else {
                await calendarService.createEvent(payload);
            }

            setShowModal(false);
            fetchEvents();
        } catch (err) {
            console.error('Failed to save event:', err);
            alert('Failed to save event');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await calendarService.deleteEvent(id);
            setShowModal(false);
            setSelectedDate(null);
            fetchEvents();
        } catch (err) {
            console.error('Failed to delete event:', err);
        }
    };

    // ── Export handlers ──────────────────────────────────────────────────

    const handleExportAll = async () => {
        try {
            const res = await calendarService.exportICS({});
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'noteg-calendar.ics';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const handleGoogleExport = async (eventId) => {
        try {
            const res = await calendarService.getGoogleCalendarUrl(eventId);
            window.open(res.data.url, '_blank');
        } catch (err) {
            console.error('Google export failed:', err);
        }
        setExportMenuOpen(null);
    };

    const handleOutlookExport = async (eventId) => {
        try {
            const res = await calendarService.getOutlookCalendarUrl(eventId);
            window.open(res.data.url, '_blank');
        } catch (err) {
            console.error('Outlook export failed:', err);
        }
        setExportMenuOpen(null);
    };

    const handleExportSingleICS = async (eventId) => {
        try {
            const res = await calendarService.exportICS({ eventIds: String(eventId) });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'event.ics';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('ICS export failed:', err);
        }
        setExportMenuOpen(null);
    };

    // ── Build calendar grid ──────────────────────────────────────────────

    const buildMonthGrid = () => {
        const first = startOfMonth(currentDate);
        const last = endOfMonth(currentDate);
        const startDay = first.getDay();
        const totalDays = last.getDate();

        const cells = [];
        // empty leading cells  
        for (let i = 0; i < startDay; i++) {
            const prevDate = new Date(first);
            prevDate.setDate(prevDate.getDate() - (startDay - i));
            cells.push({ date: prevDate, isCurrentMonth: false });
        }
        for (let d = 1; d <= totalDays; d++) {
            cells.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth(), d), isCurrentMonth: true });
        }
        // trailing cells to complete the grid
        const remaining = 42 - cells.length;
        for (let i = 1; i <= remaining; i++) {
            const nextDate = new Date(last);
            nextDate.setDate(nextDate.getDate() + i);
            cells.push({ date: nextDate, isCurrentMonth: false });
        }
        return cells;
    };

    const getEventsForDate = (date) =>
        events.filter(ev => isSameDay(new Date(ev.start_time), date));

    const today = new Date();
    const cells = buildMonthGrid();

    // Events for selected date sidebar
    const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    // ── Render ───────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen px-4 sm:px-6 py-8" style={{ background: 'var(--bg-color)' }}>
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <span className="text-3xl">📅</span>
                            Calendar
                        </h1>
                        <p className="text-gray-400 mt-1">Deadlines, live sessions &amp; reminders</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 rounded-lg text-sm border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All Events</option>
                            <option value="deadline">Deadlines</option>
                            <option value="live_session">Live Sessions</option>
                            <option value="reminder">Reminders</option>
                            <option value="custom">Custom</option>
                        </select>

                        {/* Export all */}
                        <button onClick={handleExportAll}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                            <span>📤</span> Export .ics
                        </button>

                        {/* Add event */}
                        <button onClick={() => openNewEvent(new Date())}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b88ab5)' }}>
                            + New Event
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* ── Calendar Grid ──────────────────────────────────── */}
                    <div className="lg:col-span-3 surface-card rounded-2xl p-4 sm:p-6">
                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={prevMonth} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition-colors border-none cursor-pointer text-lg">
                                ←
                            </button>
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-bold text-white">
                                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h2>
                                <button onClick={goToday}
                                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer transition-colors">
                                    Today
                                </button>
                            </div>
                            <button onClick={nextMonth} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition-colors border-none cursor-pointer text-lg">
                                →
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {DAYS.map(d => (
                                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
                            ))}
                        </div>

                        {/* Cells */}
                        {loading ? (
                            <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
                        ) : (
                            <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden">
                                {cells.map((cell, idx) => {
                                    const dayEvents = getEventsForDate(cell.date);
                                    const isToday = isSameDay(cell.date, today);
                                    const isSelected = selectedDate && isSameDay(cell.date, selectedDate);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(cell.date)}
                                            onDoubleClick={() => openNewEvent(cell.date)}
                                            className={`min-h-[90px] p-1.5 cursor-pointer transition-colors ${
                                                cell.isCurrentMonth ? 'bg-[var(--card-bg)]' : 'bg-[var(--card-bg)] opacity-40'
                                            } ${isSelected ? 'ring-2 ring-purple-500' : ''} hover:bg-white/5`}
                                        >
                                            <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                                                isToday 
                                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                                                    : 'text-gray-300'
                                            }`}>
                                                {cell.date.getDate()}
                                            </div>
                                            <div className="space-y-0.5">
                                                {dayEvents.slice(0, 3).map(ev => (
                                                    <div key={ev.id}
                                                        className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate text-white font-medium"
                                                        style={{ backgroundColor: ev.color || EVENT_COLORS[ev.event_type] || '#6b7280' }}
                                                        title={ev.title}>
                                                        {ev.title}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 flex-wrap">
                            {Object.entries(EVENT_COLORS).map(([type, color]) => (
                                <div key={type} className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-xs text-gray-400">{EVENT_LABELS[type]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Sidebar: selected date events ─────────────────── */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Selected date info */}
                        <div className="surface-card rounded-2xl p-5">
                            <h3 className="text-lg font-semibold text-white mb-1">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                    : 'Select a date'}
                            </h3>
                            {selectedDate && (
                                <button onClick={() => openNewEvent(selectedDate)}
                                    className="text-xs text-purple-400 hover:text-purple-300 bg-transparent border-none cursor-pointer mt-1">
                                    + Add event on this day
                                </button>
                            )}
                        </div>

                        {selectedDate && selectedDateEvents.length === 0 && (
                            <div className="surface-card rounded-2xl p-5 text-center text-gray-400 text-sm">
                                No events on this day
                            </div>
                        )}

                        {selectedDateEvents.map(ev => (
                            <div key={ev.id} className="surface-card rounded-2xl p-4 border-l-4 relative group"
                                style={{ borderLeftColor: ev.color || EVENT_COLORS[ev.event_type] }}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                                                style={{ backgroundColor: ev.color || EVENT_COLORS[ev.event_type] }}>
                                                {EVENT_LABELS[ev.event_type]}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-white truncate">{ev.title}</h4>
                                        {!ev.all_day && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {formatTime(ev.start_time)}
                                                {ev.end_time && ` – ${formatTime(ev.end_time)}`}
                                            </p>
                                        )}
                                        {ev.all_day && <p className="text-xs text-gray-400 mt-0.5">All day</p>}
                                        {ev.course_title && (
                                            <p className="text-xs text-purple-400 mt-0.5">{ev.course_title}</p>
                                        )}
                                        {ev.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ev.description}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-1 ml-2">
                                        <button onClick={() => openEditEvent(ev)}
                                            className="text-gray-400 hover:text-white text-xs bg-transparent border-none cursor-pointer" title="Edit">
                                            ✏️
                                        </button>
                                        <button onClick={() => handleDelete(ev.id)}
                                            className="text-gray-400 hover:text-red-400 text-xs bg-transparent border-none cursor-pointer" title="Delete">
                                            🗑️
                                        </button>
                                        <div className="relative">
                                            <button onClick={() => setExportMenuOpen(exportMenuOpen === ev.id ? null : ev.id)}
                                                className="text-gray-400 hover:text-white text-xs bg-transparent border-none cursor-pointer" title="Export">
                                                📤
                                            </button>
                                            {exportMenuOpen === ev.id && (
                                                <div className="absolute right-0 top-6 w-44 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50"
                                                    style={{ background: 'var(--dropdown-bg, #1f2937)', backdropFilter: 'blur(20px)' }}>
                                                    <button onClick={() => handleGoogleExport(ev.id)}
                                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-2">
                                                        <span>🔵</span> Google Calendar
                                                    </button>
                                                    <button onClick={() => handleOutlookExport(ev.id)}
                                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-2">
                                                        <span>🔷</span> Outlook Calendar
                                                    </button>
                                                    <button onClick={() => handleExportSingleICS(ev.id)}
                                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-2">
                                                        <span>📄</span> Download .ics
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Upcoming events widget */}
                        <UpcomingEventsWidget />
                    </div>
                </div>
            </div>

            {/* ── Event Modal ────────────────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto surface-card"
                        onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-5">
                            {editingEvent ? 'Edit Event' : 'New Event'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                                <input type="text" required value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Event title" />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.entries(EVENT_LABELS).map(([key, label]) => (
                                        <button key={key} type="button"
                                            onClick={() => setForm({ ...form, event_type: key })}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                form.event_type === key
                                                    ? 'border-white/30 text-white'
                                                    : 'border-white/5 text-gray-400 bg-white/5 hover:bg-white/10'
                                            }`}
                                            style={form.event_type === key ? { backgroundColor: EVENT_COLORS[key] } : {}}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* All day toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.all_day}
                                    onChange={e => setForm({ ...form, all_day: e.target.checked })}
                                    className="rounded accent-purple-500" />
                                <span className="text-sm text-gray-300">All day event</span>
                            </label>

                            {/* Date/Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        {form.all_day ? 'Start Date' : 'Start *'}
                                    </label>
                                    <input type={form.all_day ? 'date' : 'datetime-local'} required
                                        value={form.all_day ? form.start_time.slice(0, 10) : form.start_time}
                                        onChange={e => setForm({ ...form, start_time: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        {form.all_day ? 'End Date' : 'End'}
                                    </label>
                                    <input type={form.all_day ? 'date' : 'datetime-local'}
                                        value={form.all_day ? (form.end_time ? form.end_time.slice(0, 10) : '') : form.end_time}
                                        onChange={e => setForm({ ...form, end_time: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                                </div>
                            </div>

                            {/* Course */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Course (optional)</label>
                                <select value={form.course_id}
                                    onChange={e => setForm({ ...form, course_id: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                    <option value="">— No course —</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Professor: broadcast to all students */}
                            {isProfessor && !editingEvent && form.course_id && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_course_event}
                                        onChange={e => setForm({ ...form, is_course_event: e.target.checked })}
                                        className="rounded accent-purple-500" />
                                    <span className="text-sm text-gray-300">Create for all enrolled students</span>
                                </label>
                            )}

                            {/* Recurrence */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Repeat</label>
                                <select value={form.recurrence}
                                    onChange={e => setForm({ ...form, recurrence: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                    <option value="">Does not repeat</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            {/* Reminder */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Reminder</label>
                                <select value={form.reminder_minutes}
                                    onChange={e => setForm({ ...form, reminder_minutes: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                    <option value={0}>No reminder</option>
                                    <option value={5}>5 minutes before</option>
                                    <option value={15}>15 minutes before</option>
                                    <option value={30}>30 minutes before</option>
                                    <option value={60}>1 hour before</option>
                                    <option value={1440}>1 day before</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                <textarea rows={3} value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                    placeholder="Details..." />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <button type="submit"
                                    className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all hover:opacity-90 border-none cursor-pointer"
                                    style={{ background: 'linear-gradient(135deg, #a1609d, #b88ab5)' }}>
                                    {editingEvent ? 'Update Event' : 'Create Event'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 rounded-xl font-medium bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
                                    Cancel
                                </button>
                            </div>

                            {editingEvent && (
                                <button type="button" onClick={() => handleDelete(editingEvent.id)}
                                    className="w-full py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 bg-transparent cursor-pointer transition-colors">
                                    Delete Event
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Upcoming Events Widget ──────────────────────────────────────────────

const UpcomingEventsWidget = () => {
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await calendarService.getUpcoming(7);
                setUpcoming(res.data);
            } catch (err) {
                console.error('Failed to load upcoming:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return null;
    if (upcoming.length === 0) return null;

    return (
        <div className="surface-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <span>⏰</span> Upcoming (7 days)
            </h3>
            <div className="space-y-2">
                {upcoming.slice(0, 5).map(ev => {
                    const d = new Date(ev.start_time);
                    return (
                        <div key={ev.id} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: ev.color || EVENT_COLORS[ev.event_type] }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white truncate">{ev.title}</p>
                                <p className="text-[10px] text-gray-500">
                                    {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    {!ev.all_day && ` · ${formatTime(ev.start_time)}`}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Calendar;
