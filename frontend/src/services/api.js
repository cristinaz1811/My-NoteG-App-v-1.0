import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

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
    enrollInCourse: (courseId, enrollmentCode) => api.post(`/courses/${courseId}/enroll`, { enrollment_code: enrollmentCode }),
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
    // Enrollment code
    regenerateEnrollmentCode: (courseId) => api.post(`/courses/professor/${courseId}/regenerate-code`),
    verifyEnrollmentCode: (courseId, code) => api.post(`/courses/${courseId}/verify-code`, { code }),
    enrollByCode: (code) => api.post('/courses/enroll-by-code', { code }),
};

// Exercise services
export const exerciseService = {
    getExerciseById: (id) => api.get(`/exercises/${id}`),
    submitSolution: (id, data) => api.post(`/exercises/${id}/submit`, data),
    getUserSubmissions: (exerciseId) => api.get(`/exercises/${exerciseId}/submissions`),
    getUserSubmissionsWithCode: (exerciseId) => api.get(`/exercises/${exerciseId}/submissions`, { params: { includeCode: 'true' } }),
    getSubmissionDetail: (submissionId) => api.get(`/exercises/submissions/${submissionId}/detail`),
    // AI Hints
    getAIHints: (id, mode) => api.get(`/exercises/${id}/ai-hints`, { params: { mode } }),
    generateAIHint: (id, data) => api.post(`/exercises/${id}/ai-hints/generate`, data),
    getComplexityAnalysis: (id, data) => api.post(`/exercises/${id}/ai-complexity`, data),
    // Timed sessions
    startTimedSession: (id) => api.post(`/exercises/${id}/timed-session/start`),
    getTimedSession: (id) => api.get(`/exercises/${id}/timed-session`),
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
    // Multi-file exercise file management
    getExerciseFiles: (exerciseId) => api.get(`/exercises/professor/${exerciseId}/files`),
    addExerciseFile: (exerciseId, fileData) => api.post(`/exercises/professor/${exerciseId}/files`, fileData),
    updateExerciseFile: (fileId, fileData) => api.put(`/exercises/professor/files/${fileId}`, fileData),
    deleteExerciseFile: (fileId) => api.delete(`/exercises/professor/files/${fileId}`),
    // Bulk import/export
    bulkImport: (courseId, exercises) => api.post('/exercises/professor/bulk-import', { courseId, exercises }),
    bulkExport: (courseId) => api.get(`/exercises/professor/bulk-export/${courseId}`),
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

// Analytics services (student)
export const analyticsService = {
    getOverview: () => api.get('/analytics/overview'),
    getProgressOverTime: () => api.get('/analytics/progress-over-time'),
    getCoursePerformance: () => api.get('/analytics/course-performance'),
    getDifficultyBreakdown: () => api.get('/analytics/difficulty-breakdown'),
    getLanguageStats: () => api.get('/analytics/language-stats'),
    getRecentSubmissions: () => api.get('/analytics/recent-submissions'),
    getTimePerCourse: () => api.get('/analytics/time-per-course'),
    getAIFeedback: () => api.post('/analytics/ai-feedback'),
};

// Notification services
export const notificationService = {
    getNotifications: (params) => api.get('/notifications', { params }),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    deleteNotification: (id) => api.delete(`/notifications/${id}`),
    requestHelp: (exerciseId, message) => api.post(`/notifications/help/${exerciseId}`, { message }),
    getHelpRequests: (status) => api.get('/notifications/help-requests', { params: { status } }),
    resolveHelpRequest: (id) => api.put(`/notifications/help-requests/${id}/resolve`),
};

export default api;
