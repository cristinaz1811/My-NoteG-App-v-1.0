import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Exercise from './pages/Exercise';
import MyCourses from './pages/MyCourses';
import MyCourseDetail from './pages/MyCourseDetail';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

const Home = () => {
    return (
        <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Welcome to CodeLearn</h1>
            <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem' }}>
                Master programming through interactive exercises and challenges
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <a href="/register" className="btn btn-primary">Get Started</a>
                <a href="/courses" className="btn btn-secondary">Browse Courses</a>
            </div>
        </div>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route 
                        path="/courses" 
                        element={
                            <ProtectedRoute>
                                <Courses />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/courses/:id" 
                        element={
                            <ProtectedRoute>
                                <CourseDetail />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/exercises/:id" 
                        element={
                            <ProtectedRoute>
                                <Exercise />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/my-courses" 
                        element={
                            <ProtectedRoute>
                                <MyCourses />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/my-courses/:courseId" 
                        element={
                            <ProtectedRoute>
                                <MyCourseDetail />
                            </ProtectedRoute>
                        } 
                    />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
