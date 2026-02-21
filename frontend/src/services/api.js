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
    // Email verification
    verifyEmail: (token) => api.post('/auth/verify-email', { token }),
    resendVerification: (email) => api.post('/auth/resend-verification', { email }),
    // Password reset
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
    // Google OAuth
    googleAuth: (credential, role, mode) => api.post('/auth/google', { credential, role, mode }),
    completeGoogleSignup: (tempToken, username) => api.post('/auth/google/complete', { tempToken, username }),
    checkUsername: (username) => api.get(`/auth/check-username?username=${encodeURIComponent(username)}`),
    deleteAccount: () => api.delete('/auth/delete-account'),
};

// Course services
export const courseService = {
    getAllCourses: () => api.get('/courses'),
    getCourseById: (id) => api.get(`/courses/${id}`),
    getUserCourses: () => api.get('/courses/my-courses/list'),
    getEnrolledCourseDetails: (courseId) => api.get(`/courses/my-courses/${courseId}/details`),
    enrollInCourse: (courseId) => api.post(`/courses/${courseId}/enroll`),
    unenrollFromCourse: (courseId) => api.delete(`/courses/${courseId}/unenroll`),
    createCourse: (courseData) => api.post('/courses', courseData),
    // Time tracking
    startTimeSession: (courseId) => api.post(`/courses/my-courses/${courseId}/time/start`),
    endTimeSession: (courseId) => api.post(`/courses/my-courses/${courseId}/time/end`),
    heartbeat: (courseId) => api.post(`/courses/my-courses/${courseId}/time/heartbeat`),
    // Professor endpoints
    getProfessorCourses: () => api.get('/courses/professor/my-courses'),
    createProfessorCourse: (courseData) => api.post('/courses/professor/create', courseData),
    updateCourse: (id, courseData) => api.put(`/courses/professor/${id}`, courseData),
    deleteCourse: (id) => api.delete(`/courses/professor/${id}`),
    // Chapter management
    addChapter: (courseId, chapterData) => api.post(`/courses/professor/${courseId}/chapters`, chapterData),
    updateChapter: (chapterId, chapterData) => api.put(`/courses/professor/chapters/${chapterId}`, chapterData),
    deleteChapter: (chapterId) => api.delete(`/courses/professor/chapters/${chapterId}`),
    // Student management (professor)
    getCourseStudents: (courseId) => api.get(`/courses/professor/${courseId}/students`),
    getStudentDetails: (courseId, studentId) => api.get(`/courses/professor/${courseId}/students/${studentId}`),
};

// Exercise services
export const exerciseService = {
    getExerciseById: (id) => api.get(`/exercises/${id}`),
    submitSolution: (id, data) => api.post(`/exercises/${id}/submit`, data),
    getUserSubmissions: (exerciseId) => api.get(`/exercises/${exerciseId}/submissions`),
    // AI Hints
    getAIHints: (id, mode) => api.get(`/exercises/${id}/ai-hints`, { params: { mode } }),
    generateAIHint: (id, data) => api.post(`/exercises/${id}/ai-hints/generate`, data),
    getComplexityAnalysis: (id, data) => api.post(`/exercises/${id}/ai-complexity`, data),
    createExercise: (exerciseData) => api.post('/exercises', exerciseData),
    // Professor endpoints
    createProfessorExercise: (exerciseData) => api.post('/exercises/professor/create', exerciseData),
    updateExercise: (id, exerciseData) => api.put(`/exercises/professor/${id}`, exerciseData),
    deleteExercise: (id) => api.delete(`/exercises/professor/${id}`),
    // Test case management
    getTestCases: (exerciseId) => api.get(`/exercises/professor/${exerciseId}/test-cases`),
    addTestCase: (exerciseId, testCaseData) => api.post(`/exercises/professor/${exerciseId}/test-cases`, testCaseData),
    updateTestCase: (testCaseId, testCaseData) => api.put(`/exercises/professor/test-cases/${testCaseId}`, testCaseData),
    deleteTestCase: (testCaseId) => api.delete(`/exercises/professor/test-cases/${testCaseId}`),
};

// Plagiarism services (professor only)
export const plagiarismService = {
    runScan: (exerciseId, threshold) => api.post(`/plagiarism/scan/${exerciseId}`, { threshold }),
    getCourseReports: (courseId) => api.get(`/plagiarism/course/${courseId}/reports`),
    getReportDetails: (reportId) => api.get(`/plagiarism/report/${reportId}`),
    updateVerdict: (matchId, verdict) => api.put(`/plagiarism/match/${matchId}/verdict`, { verdict }),
    compareTwo: (submissionAId, submissionBId) => api.post('/plagiarism/compare', { submissionAId, submissionBId }),
    getNotifications: () => api.get('/plagiarism/notifications'),
    getUnreadCount: () => api.get('/plagiarism/notifications/unread-count'),
    markRead: (notificationId) => api.put(`/plagiarism/notifications/${notificationId}/read`),
};

export default api;
