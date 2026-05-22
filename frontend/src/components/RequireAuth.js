import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Gates a route behind authentication. Pass `role` to also require a role
// ('professor' additionally allows 'admin'). Unauthenticated users go to
// /login; authenticated users without the required role go to /student.
const RequireAuth = ({ children, role }) => {
    const { user, loading } = useAuth();
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role) {
        if (loading || !user) {
            return null;
        }
        const allowedRoles = role === 'professor' ? ['professor', 'admin'] : [role];
        if (!allowedRoles.includes(user.role)) {
            return <Navigate to="/student" replace />;
        }
    }

    return children;
};

export default RequireAuth;
