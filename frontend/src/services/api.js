import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth services
export const authService = {
    register: (userData) => api.post('/auth/register', userData),
    login: (credentials) => api.post('/auth/login', credentials),
    getProfile: () => api.get('/auth/profile'),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
};

// Course services
export const courseService = {
    getAllCourses: () => api.get('/courses'),
    getCourseById: (id) => api.get(`/courses/${id}`),
    getUserCourses: () => api.get('/courses/my-courses'),
    enrollInCourse: (courseId) => api.post(`/courses/${courseId}/enroll`),
    createCourse: (courseData) => api.post('/courses', courseData),
};

// Exercise services
export const exerciseService = {
    getExerciseById: (id) => api.get(`/exercises/${id}`),
    submitSolution: (id, data) => api.post(`/exercises/${id}/submit`, data),
    getUserSubmissions: (exerciseId) => api.get(`/exercises/${exerciseId}/submissions`),
    createExercise: (exerciseData) => api.post('/exercises', exerciseData),
};

export default api;
