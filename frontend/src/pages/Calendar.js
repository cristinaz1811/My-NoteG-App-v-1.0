import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { calendarService, courseService, yearService, classService } from '../services/api';

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

const EVENT_ICONS = {
    deadline: (
        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 9, height: 9, flexShrink: 0 }}>
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 3.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 1.5 0zm-.75 6a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75z" />
        </svg>
    ),
    live_session: (
        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 9, height: 9, flexShrink: 0 }}>
            <path d="M2 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8.5l-2 2v-2H4a2 2 0 0 1-2-2V5z" />
        </svg>
    ),
    reminder: (
        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 9, height: 9, flexShrink: 0 }}>
            <path d="M8 1a5.5 5.5 0 0 0-5.5 5.5c0 1.61.69 3.06 1.79 4.07L3 13h10l-1.29-2.43A5.47 5.47 0 0 0 13.5 6.5 5.5 5.5 0 0 0 8 1zm0 13a1.5 1.5 0 0 1-1.5-1.5h3A1.5 1.5 0 0 1 8 14z" />
        </svg>
    ),
    custom: (
        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 9, height: 9, flexShrink: 0 }}>
            <path d="M8 1.5a.75.75 0 0 1 .75.75v5l2.5 1.5a.75.75 0 1 1-.75 1.3L7.5 8.25V2.25A.75.75 0 0 1 8 1.5z" />
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" />
        </svg>
    ),
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
    const [filterType, setFilterType] = useState('all');
    const [exportMenuOpen, setExportMenuOpen] = useState(null);

    // Professor audience picker state
    const [shareScope, setShareScope] = useState('none'); // 'none'|'course'|'class'|'year'|'students'
    const [shareYearId, setShareYearId] = useState('');
    const [shareClassId, setShareClassId] = useState('');
    const [shareStudentIds, setShareStudentIds] = useState([]);
    const [years, setYears] = useState([]);
    const [scopeClasses, setScopeClasses] = useState([]);
    const [scopeStudents, setScopeStudents] = useState([]);

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';

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

    // Load professor's years when the modal opens
    useEffect(() => {
        if (!showModal || !isProfessor) return;
        yearService.getYears()
            .then(res => setYears((res.data || []).filter(y => y.created_by === user?.id)))
            .catch(() => {});
    }, [showModal, isProfessor, user?.id]);

    // Load classes when a year is picked
    useEffect(() => {
        if (!shareYearId) { setScopeClasses([]); setShareClassId(''); return; }
        yearService.getClassesByYear(shareYearId)
            .then(res => setScopeClasses(res.data || []))
            .catch(() => {});
    }, [shareYearId]);

    // Load students when a class is picked (for 'students' scope)
    useEffect(() => {
        if (!shareClassId || shareScope !== 'students') { setScopeStudents([]); setShareStudentIds([]); return; }
        classService.getClassStudents(shareClassId)
            .then(res => setScopeStudents(res.data || []))
            .catch(() => {});
    }, [shareClassId, shareScope]);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToday = () => setCurrentDate(new Date());

    const resetShareState = () => {
        setShareScope('none');
        setShareYearId('');
        setShareClassId('');
        setShareStudentIds([]);
        setScopeClasses([]);
        setScopeStudents([]);
    };

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
        resetShareState();
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
        resetShareState();
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
            } else if (isProfessor && shareScope === 'course' && form.course_id) {
                await calendarService.createCourseEvent(payload);
            } else if (isProfessor && shareScope === 'class' && shareClassId) {
                await calendarService.createClassEvent({ ...payload, class_id: shareClassId });
            } else if (isProfessor && shareScope === 'year' && shareYearId) {
                await calendarService.createYearEvent({ ...payload, year_id: shareYearId });
            } else if (isProfessor && shareScope === 'students' && shareStudentIds.length > 0) {
                await calendarService.createStudentsEvent({ ...payload, student_ids: shareStudentIds });
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

    const buildMonthGrid = () => {
        const first = startOfMonth(currentDate);
        const last = endOfMonth(currentDate);
        const startDay = first.getDay();
        const totalDays = last.getDate();

        const cells = [];
        for (let i = 0; i < startDay; i++) {
            const prevDate = new Date(first);
            prevDate.setDate(prevDate.getDate() - (startDay - i));
            cells.push({ date: prevDate, isCurrentMonth: false });
        }
        for (let d = 1; d <= totalDays; d++) {
            cells.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth(), d), isCurrentMonth: true });
        }
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

    // Count events for this month by type (for stats strip)
    const monthEvents = events.filter(ev => {
        const d = new Date(ev.start_time);
        return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
    });
    const statsByType = Object.keys(EVENT_COLORS).reduce((acc, type) => {
        acc[type] = monthEvents.filter(ev => ev.event_type === type).length;
        return acc;
    }, {});

    const today = new Date();
    const cells = buildMonthGrid();
    const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    return (
        <div className="min-h-screen px-4 sm:px-6 py-8" style={{ background: 'var(--bg-color)' }}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ── Header ──────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <span style={{
                                background: 'linear-gradient(135deg, #a1609d, #b88ab5)',
                                borderRadius: 12,
                                width: 44,
                                height: 44,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 22,
                                flexShrink: 0,
                            }}>📅</span>
                            Calendar
                        </h1>
                        <p className="text-gray-400 mt-1 ml-1">Deadlines, live sessions &amp; reminders</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
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

                        <button onClick={handleExportAll}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
                            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                                <path d="M8 10.5L4.5 7H7V2h2v5h2.5L8 10.5zM2 13h12v1.5H2V13z" />
                            </svg>
                            Export .ics
                        </button>

                        <button onClick={() => openNewEvent(new Date())}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105 flex items-center gap-1.5"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b88ab5)' }}>
                            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z" />
                            </svg>
                            New Event
                        </button>
                    </div>
                </div>

                {/* ── Stats strip ─────────────────────────────────────── */}
                <div className="grid grid-cols-4 gap-3">
                    {Object.entries(EVENT_COLORS).map(([type, color]) => (
                        <button key={type}
                            onClick={() => setFilterType(filterType === type ? 'all' : type)}
                            className="surface-card rounded-xl p-3 text-left transition-all hover:scale-[1.02] cursor-pointer border-none"
                            style={{
                                outline: filterType === type ? `2px solid ${color}` : 'none',
                                outlineOffset: 2,
                            }}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium" style={{ color }}>{EVENT_LABELS[type]}</span>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color, display: 'inline-block' }} />
                            </div>
                            <div className="text-2xl font-bold text-white">{statsByType[type] || 0}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">this month</div>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* ── Calendar Grid ──────────────────────────────────── */}
                    <div className="lg:col-span-3 surface-card rounded-2xl p-5">
                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-5">
                            <button onClick={prevMonth}
                                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105 border-none cursor-pointer">
                                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 16, height: 16 }}>
                                    <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-white">
                                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h2>
                                <button onClick={goToday}
                                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 cursor-pointer transition-colors">
                                    Today
                                </button>
                            </div>
                            <button onClick={nextMonth}
                                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105 border-none cursor-pointer">
                                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 16, height: 16 }}>
                                    <path d="M5.5 3L10.5 8l-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {DAYS.map((d, i) => (
                                <div key={d} className={`text-center text-xs font-semibold py-2 ${
                                    i === 0 || i === 6 ? 'text-gray-500' : 'text-gray-400'
                                }`}>{d}</div>
                            ))}
                        </div>

                        {/* Cells */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
                                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: 28, height: 28 }}>
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                                </svg>
                                <span className="text-sm">Loading events…</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 border border-white/5 rounded-xl overflow-hidden">
                                {cells.map((cell, idx) => {
                                    const dayEvents = getEventsForDate(cell.date);
                                    const isToday = isSameDay(cell.date, today);
                                    const isSelected = selectedDate && isSameDay(cell.date, selectedDate);
                                    const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(cell.date)}
                                            onDoubleClick={() => openNewEvent(cell.date)}
                                            className="min-h-[100px] p-2 cursor-pointer transition-colors relative"
                                            style={{
                                                background: isSelected
                                                    ? 'rgba(161, 96, 157, 0.12)'
                                                    : isWeekend
                                                        ? 'rgba(255,255,255,0.015)'
                                                        : 'var(--surface-color)',
                                                opacity: cell.isCurrentMonth ? 1 : 0.35,
                                                borderRight: (idx + 1) % 7 !== 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                borderBottom: idx < 35 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                outline: isSelected ? '2px solid rgba(161,96,157,0.6)' : 'none',
                                                outlineOffset: -2,
                                            }}
                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                            onMouseLeave={e => {
                                                if (!isSelected) e.currentTarget.style.background = isWeekend
                                                    ? 'rgba(255,255,255,0.015)'
                                                    : 'var(--surface-color)';
                                            }}
                                        >
                                            <div className={`text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                                                isToday
                                                    ? 'text-white'
                                                    : isWeekend
                                                        ? 'text-gray-500'
                                                        : 'text-gray-300'
                                            }`}
                                                style={isToday ? { background: 'linear-gradient(135deg, #a1609d, #b88ab5)' } : {}}>
                                                {cell.date.getDate()}
                                            </div>
                                            <div className="space-y-0.5">
                                                {dayEvents.slice(0, 3).map(ev => (
                                                    <div key={ev.id}
                                                        className="flex items-center gap-1 text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate text-white font-medium"
                                                        style={{ backgroundColor: (ev.color || EVENT_COLORS[ev.event_type] || '#6b7280') + 'cc' }}
                                                        title={ev.title}>
                                                        {EVENT_ICONS[ev.event_type]}
                                                        <span className="truncate">{ev.title}</span>
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[10px] text-gray-400 pl-1 font-medium">
                                                        +{dayEvents.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Legend */}
                        <div className="flex items-center gap-5 mt-4 flex-wrap">
                            {Object.entries(EVENT_COLORS).map(([type, color]) => (
                                <div key={type} className="flex items-center gap-1.5">
                                    <span style={{ color, display: 'flex', alignItems: 'center' }}>{EVENT_ICONS[type]}</span>
                                    <span className="text-xs text-gray-400">{EVENT_LABELS[type]}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-1.5 ml-auto">
                                <div className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center text-white font-bold"
                                    style={{ background: 'linear-gradient(135deg, #a1609d, #b88ab5)' }}>
                                    {today.getDate()}
                                </div>
                                <span className="text-xs text-gray-400">Today</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Sidebar ──────────────────────────────────────── */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Selected date header */}
                        <div className="surface-card rounded-2xl p-4">
                            {selectedDate ? (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                            </p>
                                            <h3 className="text-lg font-bold text-white leading-tight">
                                                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                            </h3>
                                        </div>
                                        {isSameDay(selectedDate, today) && (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                                                style={{ background: 'linear-gradient(135deg, #a1609d, #b88ab5)' }}>
                                                Today
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => openNewEvent(selectedDate)}
                                        className="w-full py-2 rounded-xl text-xs font-semibold text-white border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                                        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
                                            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z" />
                                        </svg>
                                        Add event
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-2">
                                    <p className="text-sm text-gray-500">Click a day to see its events</p>
                                </div>
                            )}
                        </div>

                        {selectedDate && selectedDateEvents.length === 0 && (
                            <div className="surface-card rounded-2xl p-5 text-center">
                                <div className="text-3xl mb-2">🗓️</div>
                                <p className="text-sm text-gray-400">No events this day</p>
                            </div>
                        )}

                        {selectedDateEvents.map(ev => (
                            <EventCard
                                key={ev.id}
                                ev={ev}
                                onEdit={openEditEvent}
                                onDelete={handleDelete}
                                exportMenuOpen={exportMenuOpen}
                                setExportMenuOpen={setExportMenuOpen}
                                onGoogleExport={handleGoogleExport}
                                onOutlookExport={handleOutlookExport}
                                onICSExport={handleExportSingleICS}
                            />
                        ))}

                        <UpcomingEventsWidget />
                    </div>
                </div>
            </div>

            {/* ── Event Modal ──────────────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto surface-card"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold text-white">
                                {editingEvent ? 'Edit Event' : 'New Event'}
                            </h2>
                            <button onClick={() => setShowModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-none cursor-pointer transition-colors">
                                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                                <input type="text" required value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Event title" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.entries(EVENT_LABELS).map(([key, label]) => (
                                        <button key={key} type="button"
                                            onClick={() => setForm({ ...form, event_type: key })}
                                            className="px-2 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer flex flex-col items-center gap-1"
                                            style={form.event_type === key
                                                ? { backgroundColor: EVENT_COLORS[key] + '33', borderColor: EVENT_COLORS[key], color: '#fff' }
                                                : { borderColor: 'rgba(255,255,255,0.08)', color: '#9ca3af', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                            <span style={{ color: form.event_type === key ? EVENT_COLORS[key] : '#6b7280', display: 'flex' }}>
                                                {EVENT_ICONS[key]}
                                            </span>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.all_day}
                                    onChange={e => setForm({ ...form, all_day: e.target.checked })}
                                    className="w-4 h-4 shrink-0 rounded accent-purple-500" />
                                <span className="text-sm text-gray-300">All day event</span>
                            </label>

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

                            {isProfessor && !editingEvent && (
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Share with students</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: 'none', label: 'Only me' },
                                            { key: 'course', label: 'Course', disabled: !form.course_id },
                                            { key: 'class', label: 'Class' },
                                            { key: 'year', label: 'Year' },
                                            { key: 'students', label: 'Specific students' },
                                        ].map(({ key, label, disabled }) => (
                                            <button key={key} type="button"
                                                disabled={disabled}
                                                onClick={() => { setShareScope(key); setShareYearId(''); setShareClassId(''); setShareStudentIds([]); }}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                style={shareScope === key
                                                    ? { background: 'rgba(161,96,157,0.25)', borderColor: '#a1609d', color: '#fff' }
                                                    : { background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {(shareScope === 'class' || shareScope === 'year' || shareScope === 'students') && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Year</label>
                                            <select value={shareYearId}
                                                onChange={e => setShareYearId(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                                <option value="">— Select year —</option>
                                                {years.map(y => (
                                                    <option key={y.id} value={y.id}>{y.name} {y.faculty ? `· ${y.faculty}` : ''} {y.school_year ? `(${y.school_year})` : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {(shareScope === 'class' || shareScope === 'students') && shareYearId && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Class</label>
                                            <select value={shareClassId}
                                                onChange={e => setShareClassId(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                                <option value="">— Select class —</option>
                                                {scopeClasses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {shareScope === 'students' && shareClassId && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">
                                                Students ({shareStudentIds.length} selected)
                                            </label>
                                            {scopeStudents.length === 0
                                                ? <p className="text-xs text-gray-500">No approved students in this class.</p>
                                                : (
                                                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                                        {scopeStudents.map(s => (
                                                            <label key={s.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-lg hover:bg-white/5">
                                                                <input type="checkbox"
                                                                    checked={shareStudentIds.includes(s.id)}
                                                                    onChange={e => setShareStudentIds(prev =>
                                                                        e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                                                                    )}
                                                                    className="w-3.5 h-3.5 shrink-0 rounded accent-purple-500" />
                                                                <span className="text-xs text-gray-300">{s.username}</span>
                                                                <span className="text-xs text-gray-500 truncate">{s.email}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )
                                            }
                                        </div>
                                    )}

                                    {shareScope === 'course' && !form.course_id && (
                                        <p className="text-xs text-gray-500">Select a course above to share with its students.</p>
                                    )}
                                </div>
                            )}

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

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                <textarea rows={3} value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                    placeholder="Details..." />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button type="submit"
                                    className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 border-none cursor-pointer"
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

// ── Event Card ───────────────────────────────────────────────────────────

const EventCard = ({ ev, onEdit, onDelete, exportMenuOpen, setExportMenuOpen, onGoogleExport, onOutlookExport, onICSExport }) => {
    const color = ev.color || EVENT_COLORS[ev.event_type];
    return (
        <div className="surface-card rounded-2xl overflow-hidden relative">
            {/* Color accent bar */}
            <div className="h-1 w-full" style={{ background: color }} />
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span style={{ color, display: 'flex', alignItems: 'center' }}>{EVENT_ICONS[ev.event_type]}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
                                {EVENT_LABELS[ev.event_type]}
                            </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white leading-tight">{ev.title}</h4>
                        {!ev.all_day && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 10, height: 10, flexShrink: 0 }}>
                                    <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-3a.75.75 0 0 1 .75.75v2.75h1.75a.75.75 0 0 1 0 1.5H7.25V5.75A.75.75 0 0 1 8 5z" />
                                </svg>
                                {formatTime(ev.start_time)}{ev.end_time && ` – ${formatTime(ev.end_time)}`}
                            </p>
                        )}
                        {ev.all_day && <p className="text-xs text-gray-400 mt-1">All day</p>}
                        {ev.course_title && (
                            <p className="text-xs mt-1" style={{ color: '#a1609d' }}>{ev.course_title}</p>
                        )}
                        {ev.description && (
                            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{ev.description}</p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => onEdit(ev)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-none cursor-pointer transition-colors"
                            title="Edit">
                            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086z" />
                            </svg>
                        </button>
                        <div className="relative">
                            <button onClick={() => setExportMenuOpen(exportMenuOpen === ev.id ? null : ev.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-none cursor-pointer transition-colors"
                                title="Export">
                                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
                                    <path d="M8 10.5L4.5 7H7V2h2v5h2.5L8 10.5zM2 13h12v1.5H2V13z" />
                                </svg>
                            </button>
                            {exportMenuOpen === ev.id && (
                                <div className="absolute right-0 top-8 w-44 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50"
                                    style={{ background: 'var(--dropdown-bg)', backdropFilter: 'blur(20px)' }}>
                                    <button onClick={() => onGoogleExport(ev.id)}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0" />
                                        Google Calendar
                                    </button>
                                    <button onClick={() => onOutlookExport(ev.id)}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-2">
                                        <span className="w-4 h-4 rounded bg-blue-700 flex-shrink-0" />
                                        Outlook Calendar
                                    </button>
                                    <button onClick={() => onICSExport(ev.id)}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-2">
                                        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14, flexShrink: 0 }}>
                                            <path d="M8 10.5L4.5 7H7V2h2v5h2.5L8 10.5zM2 13h12v1.5H2V13z" />
                                        </svg>
                                        Download .ics
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => onDelete(ev.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border-none cursor-pointer transition-colors"
                            title="Delete">
                            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
                                <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.75 1.75 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Upcoming Events Widget ───────────────────────────────────────────────

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

    if (loading || upcoming.length === 0) return null;

    return (
        <div className="surface-card rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
                    <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-3a.75.75 0 0 1 .75.75v2.75h1.75a.75.75 0 0 1 0 1.5H7.25V5.75A.75.75 0 0 1 8 5z" />
                </svg>
                Next 7 days
            </h3>
            <div className="space-y-2.5">
                {upcoming.slice(0, 5).map(ev => {
                    const d = new Date(ev.start_time);
                    const color = ev.color || EVENT_COLORS[ev.event_type];
                    return (
                        <div key={ev.id} className="flex items-start gap-2.5">
                            <div className="w-1 rounded-full flex-shrink-0 mt-1" style={{ height: 28, backgroundColor: color }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white font-medium truncate">{ev.title}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">
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
