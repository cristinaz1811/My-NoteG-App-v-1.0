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

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'new_exercise': return '📝';
            case 'new_chapter': return '📚';
            case 'course_completed': return '🎉';
            case 'student_needs_help': return '🆘';
            case 'course_enrollment': return '👋';
            default: return '🔔';
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
                style={{ fontSize: '1.2rem' }}
            >
                🔔
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
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50"
                    style={{ background: 'var(--dropdown-bg)', backdropFilter: 'blur(20px)', maxHeight: '480px' }}
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
                                <div className="text-3xl mb-2">🔕</div>
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
                                    <span className="text-xl flex-shrink-0 mt-0.5">
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
