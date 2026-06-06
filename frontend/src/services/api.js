import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';
export const BACKEND_URL = API_URL.replace('/api', '');

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
    uploadAvatar: (base64) => api.post('/auth/avatar', { avatar: base64 }),
    updateProfile: (data) => api.put('/auth/profile', data),
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
    getCourseExerciseStats: (courseId) => api.get(`/courses/professor/${courseId}/exercise-stats`),
    getExerciseStudentAttempts: (courseId, exerciseId) => api.get(`/courses/professor/${courseId}/exercise/${exerciseId}/students`),
    // Enrollment code
    regenerateEnrollmentCode: (courseId) => api.post(`/courses/professor/${courseId}/regenerate-code`),
    verifyEnrollmentCode: (courseId, code) => api.post(`/courses/${courseId}/verify-code`, { code }),
    enrollByCode: (code) => api.post('/courses/enroll-by-code', { code }),
};

// Exercise services
export const exerciseService = {
    getExerciseById: (id) => api.get(`/exercises/${id}`),
    submitSolution: (id, data) => api.post(`/exercises/${id}/submit`, data),
    getJobResult: (jobId) => api.get(`/exercises/jobs/${jobId}/result`),
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
    recordViolation: (id) => api.post(`/exercises/${id}/timed-session/violation`),
    unlockStudentSession: (exerciseId, userId) => api.post(`/exercises/professor/${exerciseId}/sessions/${userId}/unlock`),
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
    getRecommendedNext: () => api.get('/analytics/recommended-next'),
    getAIFeedback: () => api.post('/analytics/ai-feedback'),
};

// Feedback services
export const feedbackService = {
    // Student endpoints
    getMyAllFeedback: () => api.get('/feedback/my-all'),
    getCourseFeedback: (courseId) => api.get(`/feedback/course/${courseId}`),
    // Professor endpoints
    sendFeedback: (data) => api.post('/feedback/send', data),
    updateFeedback: (feedbackId, data) => api.put(`/feedback/${feedbackId}`, data),
    deleteFeedback: (feedbackId) => api.delete(`/feedback/${feedbackId}`),
    getProfessorFeedback: (courseId) => api.get('/feedback/professor', { params: courseId ? { courseId } : {} }),
};

// Calendar services
export const calendarService = {
    getEvents: (params) => api.get('/calendar', { params }),
    getUpcoming: (days) => api.get('/calendar/upcoming', { params: { days } }),
    getEventById: (id) => api.get(`/calendar/${id}`),
    createEvent: (data) => api.post('/calendar', data),
    createCourseEvent: (data) => api.post('/calendar/course-event', data),
    createClassEvent: (data) => api.post('/calendar/class-event', data),
    createYearEvent: (data) => api.post('/calendar/year-event', data),
    createStudentsEvent: (data) => api.post('/calendar/students-event', data),
    updateEvent: (id, data) => api.put(`/calendar/${id}`, data),
    deleteEvent: (id) => api.delete(`/calendar/${id}`),
    exportICS: (params) => api.get('/calendar/export/ics', { params, responseType: 'blob' }),
    getGoogleCalendarUrl: (id) => api.get(`/calendar/${id}/google-url`),
    getOutlookCalendarUrl: (id) => api.get(`/calendar/${id}/outlook-url`),
};

// Year services
export const yearService = {
    getYears: () => api.get('/years'),
    getYearById: (id) => api.get(`/years/${id}`),
    createYear: (data) => api.post('/years', data),
    updateYear: (id, data) => api.put(`/years/${id}`, data),
    deleteYear: (id) => api.delete(`/years/${id}`),
    getClassesByYear: (yearId) => api.get(`/years/${yearId}/classes`),
    createClass: (yearId, data) => api.post(`/years/${yearId}/classes`, data),
};

// Class services
export const classService = {
    getClassById: (id) => api.get(`/classes/${id}`),
    updateClass: (id, data) => api.put(`/classes/${id}`, data),
    deleteClass: (id) => api.delete(`/classes/${id}`),
    // Enrollment
    getEnrollmentStatus: (classId) => api.get(`/classes/${classId}/enrollment-status`),
    requestEnrollment: (classId, data) => api.post(`/classes/${classId}/enroll`, data || {}),
    getAllEnrollmentRequests: (status) => api.get('/classes/all-enrollment-requests', { params: status ? { status } : {} }),
    getEnrollmentRequests: (classId) => api.get(`/classes/${classId}/enrollment-requests`),
    approveEnrollment: (classId, userId) => api.put(`/classes/${classId}/enrollment-requests/${userId}/approve`),
    rejectEnrollment: (classId, userId) => api.put(`/classes/${classId}/enrollment-requests/${userId}/reject`),
    regenerateAccessKey: (classId) => api.post(`/classes/${classId}/regenerate-key`),
    getClassStudents: (classId) => api.get(`/classes/${classId}/students`),
};

// Lecture services
export const lectureService = {
    getLecturesByCourse: (courseId) => api.get(`/lectures/course/${courseId}`),
    getLecture: (id) => api.get(`/lectures/${id}`),
    createLecture: (courseId, data) => api.post(`/lectures/course/${courseId}`, data),
    updateLecture: (id, data) => api.put(`/lectures/${id}`, data),
    deleteLecture: (id) => api.delete(`/lectures/${id}`),
    // Pages
    addPage: (lectureId, data) => api.post(`/lectures/${lectureId}/pages`, data),
    updatePage: (lectureId, pageId, data) => api.put(`/lectures/${lectureId}/pages/${pageId}`, data),
    deletePage: (lectureId, pageId) => api.delete(`/lectures/${lectureId}/pages/${pageId}`),
    // Media (FormData upload)
    uploadMedia: (lectureId, formData) => api.post(`/lectures/${lectureId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    deleteMedia: (lectureId, mediaId) => api.delete(`/lectures/${lectureId}/media/${mediaId}`),
    // Student progress
    updateProgress: (lectureId, data) => api.post(`/lectures/${lectureId}/progress`, data),
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

export const sqlSessionService = {
    startSession:    (exerciseId)         => api.post(`/sql-sessions/${exerciseId}/start`).then(r => r.data),
    runQuery:        (exerciseId, query)  => api.post(`/sql-sessions/${exerciseId}/query`, { query }).then(r => r.data),
    validateAnswer:  (exerciseId, query)  => api.post(`/sql-sessions/${exerciseId}/validate`, { query }).then(r => r.data),
    resetSession:    (exerciseId)         => api.post(`/sql-sessions/${exerciseId}/reset`).then(r => r.data),
};

export default api;
