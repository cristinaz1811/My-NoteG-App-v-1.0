import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const getNotificationIcon = (type) => {
        const p = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
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

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
        setIsOpen(false);
    };

    const recentNotifications = notifications.slice(0, 8);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                    <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                {unreadCount > 0 && (
                    <span 
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                        style={{ background: 'linear-gradient(135deg, #a1609d, #e74c3c)' }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="notification-dropdown absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50"
                    style={{ backdropFilter: 'blur(20px)', maxHeight: '480px', background: 'var(--notification-dropdown-bg, rgba(30,35,44,0.98))' }}
                >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white m-0">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-gray-400 hover:text-[#fef483] transition-colors border-none bg-transparent cursor-pointer"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                                className="text-xs text-gray-400 hover:text-[#fef483] transition-colors border-none bg-transparent cursor-pointer"
                            >
                                View all
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                        {recentNotifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                <div className="text-sm font-semibold mb-2">No alerts</div>
                                No notifications yet
                            </div>
                        ) : (
                            recentNotifications.map(notification => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors cursor-pointer border-none flex items-start gap-3 ${
                                        notification.is_read 
                                            ? 'bg-transparent hover:bg-white/5' 
                                            : 'hover:bg-white/10'
                                    }`}
                                    style={!notification.is_read ? { background: 'rgba(161, 96, 157, 0.08)' } : {}}
                                >
                                    {/* Icon */}
                                    <span
                                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ background: getNotificationColor(notification.type) + '20', color: getNotificationColor(notification.type) }}
                                    >
                                        {getNotificationIcon(notification.type)}
                                    </span>
                                    
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm m-0 leading-snug ${notification.is_read ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 m-0">
                                            {formatTime(notification.created_at)}
                                        </p>
                                    </div>

                                    {/* Unread dot */}
                                    {!notification.is_read && (
                                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: '#a1609d' }}></span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
