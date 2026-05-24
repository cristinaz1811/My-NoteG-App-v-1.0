import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';

export const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        const { user, token } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        
        return response;
    };

    const register = async (userData) => {
        const response = await authService.register(userData);
        const { user, token, emailVerificationRequired } = response.data;
        
        // Only store token/user if email verification is not required
        // or for showing pending verification state
        if (!emailVerificationRequired) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
        }
        
        return response;
    };

    const googleLogin = async (credential, role = 'student', mode) => {
        const response = await authService.googleAuth(credential, role, mode);
        
        // If user needs to choose username, return the response without setting auth
        if (response.data.needsUsername) {
            return response;
        }
        
        const { user, token } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        
        return response;
    };

    const setUserAfterVerification = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const updateUser = (fields) => {
        const updated = { ...user, ...fields };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            googleLogin,
            setUserAfterVerification,
            updateUser,
            logout,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};
