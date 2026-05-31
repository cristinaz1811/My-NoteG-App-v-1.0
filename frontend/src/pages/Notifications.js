import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api';

const Notifications = () => {
    const { user } = useAuth();
    const { notifications, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications();
    const [filter, setFilter] = useState('all'); // 'all', 'unread'
    const [helpRequests, setHelpRequests] = useState([]);
    const [helpFilter, setHelpFilter] = useState('open');
    const [activeTab, setActiveTab] = useState('notifications');
    const navigate = useNavigate();

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';

    useEffect(() => {
        fetchNotifications({ limit: 100, unreadOnly: filter === 'unread' ? 'true' : 'false' });
    }, [filter, fetchNotifications]);

    const fetchHelpRequests = useCallback(async () => {
        try {
            const response = await notificationService.getHelpRequests(helpFilter);
            setHelpRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch help requests:', error);
        }
    }, [helpFilter]);

    useEffect(() => {
        if (isProfessor && activeTab === 'help') {
            fetchHelpRequests();
        }
    }, [isProfessor, activeTab, fetchHelpRequests]);

    const handleResolveHelp = async (id) => {
        try {
            await notificationService.resolveHelpRequest(id);
            setHelpRequests(prev => prev.map(hr => hr.id === id ? { ...hr, status: 'resolved' } : hr));
        } catch (error) {
            console.error('Failed to resolve help request:', error);
        }
    };

    const getNotificationIcon = (type) => {
        const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
        switch (type) {
            case 'new_exercise':
                return <svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
            case 'new_chapter':
                return <svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
            case 'course_completed':
                return <svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
            case 'student_needs_help':
                return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
            case 'course_enrollment':
            case 'class_enrollment_request':
                return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
            case 'enrollment_approved':
                return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
            case 'enrollment_rejected':
                return <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
            default:
                return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'new_exercise': return '#fef483';
            case 'new_chapter': return '#60a5fa';
            case 'course_completed': return '#34d399';
            case 'student_needs_help': return '#f87171';
            case 'course_enrollment': return '#a1609d';
            case 'class_enrollment_request': return '#f59e0b';
            case 'enrollment_approved': return '#34d399';
            case 'enrollment_rejected': return '#f87171';
            default: return '#a1609d';
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <div className="min-h-screen px-6 py-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Notifications</h1>
                        <p className="text-gray-400 text-sm">
                            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all border-none cursor-pointer"
                            style={{ background: 'rgba(161, 96, 157, 0.15)', color: '#a1609d' }}
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Tabs for professors */}
                {isProfessor && (
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-none cursor-pointer ${
                                activeTab === 'notifications'
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                            style={activeTab === 'notifications' ? { background: 'rgba(161, 96, 157, 0.2)', color: '#a1609d' } : { background: 'transparent' }}
                        >
                            Notifications
                        </button>
                        <button
                            onClick={() => setActiveTab('help')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-none cursor-pointer ${
                                activeTab === 'help'
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                            style={activeTab === 'help' ? { background: 'rgba(248, 113, 113, 0.2)', color: '#f87171' } : { background: 'transparent' }}
                        >
                            Help Requests
                        </button>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <>
                        {/* Filter */}
                        <div className="flex gap-2 mb-6">
                            {['all', 'unread'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-none cursor-pointer capitalize ${
                                        filter === f ? 'text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                                    style={filter === f ? { background: 'rgba(255,255,255,0.1)' } : { background: 'transparent' }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Notification List */}
                        <div className="space-y-2">
                            {notifications.length === 0 ? (
                                <div className="surface-card rounded-2xl p-12 text-center">
                                    <h3 className="text-lg font-medium text-white mb-2">
                                        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                                    </h3>
                                    <p className="text-gray-400 text-sm">
                                        {filter === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here when there\'s activity in your courses.'}
                                    </p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`surface-card rounded-xl p-4 flex items-start gap-4 transition-all group ${
                                            !notification.is_read ? 'ring-1' : ''
                                        }`}
                                        style={!notification.is_read ? { 
                                            borderColor: getNotificationColor(notification.type) + '30',
                                            background: `rgba(30, 35, 44, 0.95)`,
                                            ringColor: getNotificationColor(notification.type) + '30'
                                        } : {}}
                                    >
                                        {/* Icon */}
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: getNotificationColor(notification.type) + '20', color: getNotificationColor(notification.type) }}
                                        >
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className={`text-sm m-0 leading-relaxed ${notification.is_read ? 'text-gray-400' : 'text-gray-200'}`}>
                                                        <span className="font-semibold" style={{ color: getNotificationColor(notification.type) }}>
                                                            {notification.title}
                                                        </span>
                                                        {' — '}
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1.5 m-0">
                                                        {formatDate(notification.created_at)}
                                                        {notification.from_username && (
                                                            <span> · from <span className="text-gray-400">{notification.from_username}</span></span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {notification.link && (
                                                        <button
                                                            onClick={() => handleNotificationClick(notification)}
                                                            className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
                                                            title="Go to"
                                                        >
                                                            →
                                                        </button>
                                                    )}
                                                    {!notification.is_read && (
                                                        <button
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
                                                            title="Mark as read"
                                                        >
                                                            ✓
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all border-none bg-transparent cursor-pointer"
                                                        title="Delete"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.is_read && (
                                            <span 
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                                                style={{ background: getNotificationColor(notification.type) }}
                                            ></span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Help Requests Tab (Professor only) */}
                {activeTab === 'help' && isProfessor && (
                    <>
                        <div className="flex gap-2 mb-6">
                            {['open', 'resolved', 'all'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setHelpFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-none cursor-pointer capitalize ${
                                        helpFilter === s ? 'text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                                    style={helpFilter === s ? { background: 'rgba(255,255,255,0.1)' } : { background: 'transparent' }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {helpRequests.length === 0 ? (
                                <div className="surface-card rounded-2xl p-12 text-center">
                                    <h3 className="text-lg font-medium text-white mb-2">No help requests</h3>
                                    <p className="text-gray-400 text-sm">
                                        {helpFilter === 'open' ? 'All students are doing well!' : 'No help requests found.'}
                                    </p>
                                </div>
                            ) : (
                                helpRequests.map(hr => (
                                    <div key={hr.id} className="surface-card rounded-xl p-4 flex items-start gap-4">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: hr.status === 'open' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(52, 211, 153, 0.2)', color: hr.status === 'open' ? '#f87171' : '#34d399' }}
                                        >
                                            {hr.status === 'open'
                                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                            }
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-200 m-0">
                                                <span className="font-semibold text-white">{hr.student_name}</span>
                                                {' needs help with '}
                                                <span className="font-medium" style={{ color: '#fef483' }}>{hr.exercise_title}</span>
                                                {' in '}
                                                <span className="text-gray-300">{hr.course_title}</span>
                                            </p>
                                            {hr.message && (
                                                <p className="text-xs text-gray-400 mt-1 m-0 italic">"{hr.message}"</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1.5 m-0">
                                                {formatDate(hr.created_at)}
                                                {hr.status === 'resolved' && hr.resolved_at && (
                                                    <span> · Resolved {formatDate(hr.resolved_at)}</span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/professor/course/${hr.course_id}/students/${hr.student_id}`)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all border-none cursor-pointer"
                                                style={{ background: 'rgba(255,255,255,0.05)' }}
                                            >
                                                View Student
                                            </button>
                                            {hr.status === 'open' && (
                                                <button
                                                    onClick={() => handleResolveHelp(hr.id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all border-none cursor-pointer"
                                                    style={{ background: 'rgba(52, 211, 153, 0.3)' }}
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Notifications;
