import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import RequireAuth from './RequireAuth';

const renderWithAuth = (authValue, { role } = {}) =>
    render(
        <AuthContext.Provider value={authValue}>
            <MemoryRouter initialEntries={['/private']}>
                <Routes>
                    <Route
                        path="/private"
                        element={
                            <RequireAuth role={role}>
                                <div>protected content</div>
                            </RequireAuth>
                        }
                    />
                    <Route path="/login" element={<div>login page</div>} />
                    <Route path="/student" element={<div>student home</div>} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

afterEach(() => localStorage.clear());

describe('RequireAuth', () => {
    it('redirects to /login when there is no token', () => {
        renderWithAuth({ user: null, loading: false });
        expect(screen.getByText('login page')).toBeInTheDocument();
    });

    it('renders children when a token is present and no role is required', () => {
        localStorage.setItem('token', 'a-token');
        renderWithAuth({ user: { role: 'student' }, loading: false });
        expect(screen.getByText('protected content')).toBeInTheDocument();
    });

    it('redirects a student away from a professor-only route', () => {
        localStorage.setItem('token', 'a-token');
        renderWithAuth({ user: { role: 'student' }, loading: false }, { role: 'professor' });
        expect(screen.getByText('student home')).toBeInTheDocument();
    });

    it('allows a professor into a professor-only route', () => {
        localStorage.setItem('token', 'a-token');
        renderWithAuth({ user: { role: 'professor' }, loading: false }, { role: 'professor' });
        expect(screen.getByText('protected content')).toBeInTheDocument();
    });

    it('allows an admin into a professor-only route', () => {
        localStorage.setItem('token', 'a-token');
        renderWithAuth({ user: { role: 'admin' }, loading: false }, { role: 'professor' });
        expect(screen.getByText('protected content')).toBeInTheDocument();
    });
});
