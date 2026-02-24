import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;

    // Fetch unread count from API
    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await notificationService.getUnreadCount();
            setUnreadCount(response.data.count);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    }, []);

    // Fetch notifications from API
    const fetchNotifications = useCallback(async (options = {}) => {
        try {
            setLoading(true);
            const response = await notificationService.getNotifications(options);
            setNotifications(response.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Mark a notification as read
    const markAsRead = useCallback(async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }, []);

    // Delete a notification
    const deleteNotification = useCallback(async (id) => {
        try {
            const notification = notifications.find(n => n.id === id);
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (notification && !notification.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }, [notifications]);

    // Connect WebSocket
    const connectWebSocket = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token || !user) return;

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = process.env.REACT_APP_WS_URL || `${wsProtocol}//${window.location.host}`;
        const wsUrl = `${wsHost}/ws`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] Connected, authenticating...');
                reconnectAttemptsRef.current = 0;
                ws.send(JSON.stringify({ type: 'auth', token }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'auth_success') {
                        console.log('[WS] Authenticated successfully');
                    } else if (data.type === 'notification') {
                        // Add new notification to the top of the list
                        setNotifications(prev => [data.notification, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    }
                } catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };

            ws.onclose = (event) => {
                console.log('[WS] Connection closed', event.code);
                wsRef.current = null;

                // Auto-reconnect with exponential backoff
                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && user) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    reconnectAttemptsRef.current++;
                    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
                    reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
                }
            };

            ws.onerror = (error) => {
                console.error('[WS] Error:', error);
            };
        } catch (error) {
            console.error('[WS] Connection failed:', error);
        }
    }, [user]);

    // Connect WebSocket when user logs in, disconnect on logout
    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            fetchNotifications({ limit: 20 });
            connectWebSocket();
        } else {
            // Cleanup on logout
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            setNotifications([]);
            setUnreadCount(0);
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [user, connectWebSocket, fetchUnreadCount, fetchNotifications]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            fetchNotifications,
            fetchUnreadCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
