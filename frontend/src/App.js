import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { courseService, calendarService } from './services/api';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Exercise from './pages/Exercise';
import MyCourses from './pages/MyCourses';
import MyCourseDetail from './pages/MyCourseDetail';
import ProfessorDashboard from './pages/ProfessorDashboard';
import CreateCourse from './pages/CreateCourse';
import EditCourse from './pages/EditCourse';
import EditExercise from './pages/EditExercise';
import CourseStudents from './pages/CourseStudents';
import ExerciseAttempts from './pages/ExerciseAttempts';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerificationPending from './pages/VerificationPending';
import ResendVerification from './pages/ResendVerification';
import ChooseUsername from './pages/ChooseUsername';
import Profile from './pages/Profile';
import PlagiarismDashboard from './pages/PlagiarismDashboard';
import PlagiarismReport from './pages/PlagiarismReport';
import Notifications from './pages/Notifications';
import StudentAnalytics from './pages/StudentAnalytics';
import Calendar from './pages/Calendar';
import YearsClasses from './pages/YearsClasses';
import ClassDetail from './pages/ClassDetail';
import EnrollmentRequests from './pages/EnrollmentRequests';
import LectureViewer from './pages/LectureViewer';
import CreateEditLecture from './pages/CreateEditLecture';

// Animated Background Component
const AnimatedBackground = () => (
    <div className="animated-bg">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
        <div className="bg-orb bg-orb-4"></div>
        <div className="bg-orb bg-orb-5"></div>
        <div className="bg-orb bg-orb-6"></div>
        <div className="bg-orb bg-orb-7"></div>
    </div>
);

// Main Landing Page (simple welcome screen)
const LandingPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--gradient-page)' }}>
            {/* Floating background shapes */}
            <div className="absolute w-96 h-96 rounded-full -top-48 -left-48 opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(161, 96, 157, 0.6), transparent)' }}></div>
            <div className="absolute w-72 h-72 rounded-full -bottom-36 -right-36 opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(254, 244, 131, 0.6), transparent)', animationDelay: '1s' }}></div>
            <div className="absolute w-80 h-80 rounded-full top-1/2 -right-40 opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(184, 138, 181, 0.6), transparent)', animationDelay: '2s' }}></div>

            <div className="text-center space-y-8 max-w-lg relative z-10">
                {/* Logo */}
                <div className="space-y-6 animate-slideUp">
                    <img src="/logo.png" alt="Note G" className="w-48 h-48 mx-auto" style={{ filter: 'drop-shadow(0 0 40px rgba(161, 96, 157, 0.4))' }} />
                    <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight">
                        Note G
                    </h1>
                    <p className="text-xl sm:text-2xl font-medium" style={{ color: '#fef483' }}>
                        Learn to code the fun way
                    </p>
                </div>

                {/* Buttons */}
                <div className="space-y-4 pt-8">
                    <Link 
                        to="/login" 
                        className="w-full block px-8 py-4 bg-white text-gray-900 font-bold rounded-2xl text-lg hover:bg-gray-100 transition-all shadow-lg no-underline hover:scale-105 active:scale-95"
                    >
                        Log In
                    </Link>
                    <Link 
                        to="/get-started" 
                        className="w-full block px-8 py-4 gradient-bg text-white font-bold rounded-2xl text-lg shadow-lg no-underline hover:scale-105 active:scale-95 transition-all"
                        style={{ boxShadow: '0 8px 30px rgba(161, 96, 157, 0.5)' }}
                    >
                        Get Started
                    </Link>
                </div>

                <p className="text-[#fef483] text-sm font-medium pt-4">
                    Join thousands of students and educators learning together
                </p>
            </div>
        </div>
    );
};

// Role Selection Page (after landing)
const RoleSelection = () => {
    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: 'var(--bg-color)' }}>
            <div className="max-w-4xl w-full text-center">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <img src="/logo.png" alt="Note G" className="w-32 h-32" />
                    <span className="text-4xl font-bold text-white">Note G</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                    Welcome to <span className="gradient-text">Note G</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                    The interactive platform for learning and teaching programming. Choose your role to get started.
                </p>

                {/* Role Selection Cards */}
                <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Student Card */}
                    <Link 
                        to="/register?role=student"
                        className="surface-card card-hover p-8 rounded-2xl text-left group no-underline"
                    >
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                             style={{ background: 'linear-gradient(135deg, rgba(254, 244, 131, 0.2), rgba(161, 96, 157, 0.2))', color: '#fef483' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-[#fef483] transition-colors">
                            I'm a Student
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Learn programming through interactive courses, hands-on exercises, and real-time feedback.
                        </p>
                        <div className="flex items-center gap-2 text-[#fef483] font-medium">
                            <span>Start Learning</span>
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </Link>

                    {/* Professor Card */}
                    <Link 
                        to="/register?role=professor"
                        className="surface-card card-hover p-8 rounded-2xl text-left group no-underline"
                    >
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                             style={{ background: 'linear-gradient(135deg, rgba(161, 96, 157, 0.2), rgba(184, 138, 181, 0.2))', color: '#a1609d' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2"/>
                                <line x1="8" y1="21" x2="16" y2="21"/>
                                <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-[#a1609d] transition-colors">
                            I'm a Professor
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Create courses, design exercises, and track your students' progress in real-time.
                        </p>
                        <div className="flex items-center gap-2 text-[#a1609d] font-medium">
                            <span>Start Teaching</span>
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </Link>
                </div>

                {/* Footer */}
                <p className="text-sm text-gray-500 mt-12">
                    Already have an account? <Link to="/login" className="text-[#fef483] hover:text-[#fff9c4]">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

const EVENT_COLORS = {
    deadline: '#ef4444',
    live_session: '#8b5cf6',
    reminder: '#f59e0b',
    custom: '#06b6d4',
};
const EVENT_LABELS = {
    deadline: 'Deadline',
    live_session: 'Live Session',
    reminder: 'Reminder',
    custom: 'Event',
};

const Home = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [events, setEvents] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(false);

    useEffect(() => {
        if (!user) return;

        setLoadingCourses(true);
        const fetchCourses = user.role === 'professor'
            ? courseService.getProfessorCourses()
            : courseService.getUserCourses();
        fetchCourses
            .then(res => setCourses((res.data || []).slice(0, 3)))
            .catch(() => {})
            .finally(() => setLoadingCourses(false));

        setLoadingEvents(true);
        calendarService.getUpcoming(7)
            .then(res => setEvents((res.data || []).slice(0, 4)))
            .catch(() => {})
            .finally(() => setLoadingEvents(false));
    }, [user]);

    const formatEventDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen pt-8">
            {/* Hero Section */}
            <section className="min-h-[calc(100vh-4rem)] flex items-start pt-36 px-6 py-12">
                <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-start">
                    {/* Left Content */}
                    <div className="animate-slideUp">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6"
                             style={{ background: 'rgba(161, 96, 157, 0.1)', border: '1px solid rgba(161, 96, 157, 0.3)' }}>
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span>Join thousands of developers learning right now</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                            Master Code,<br/>
                            <span className="gradient-text">Build Your Future</span>
                        </h1>

                        <p className="text-lg sm:text-xl mb-8 opacity-80 max-w-lg">
                            Interactive lessons, real-world projects, and a supportive community to take you from beginner to professional developer.
                        </p>

                        <Link
                            to="/courses"
                            className="inline-block px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 glow gradient-bg text-white text-center no-underline"
                        >
                            Browse Courses
                        </Link>
                    </div>

                    {/* Code Editor Preview */}
                    <div className="animate-float hidden lg:block">
                        <div className="code-block rounded-2xl overflow-hidden glow">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="ml-4 text-sm opacity-50 font-mono">welcome.js</span>
                            </div>
                            <div className="p-6 font-mono text-sm sm:text-base">
                                <div><span className="text-purple-400">const</span> <span className="text-cyan-300">developer</span> = {'{'}</div>
                                <div className="pl-6"><span className="text-green-300">name</span>: <span className="text-amber-300">"You"</span>,</div>
                                <div className="pl-6"><span className="text-green-300">skills</span>: [<span className="text-amber-300">"HTML"</span>, <span className="text-amber-300">"CSS"</span>, <span className="text-amber-300">"JS"</span>],</div>
                                <div className="pl-6"><span className="text-green-300">isLearning</span>: <span className="text-orange-400">true</span>,</div>
                                <div className="pl-6"><span className="text-green-300">potential</span>: <span className="text-cyan-300">Infinity</span></div>
                                <div>{'}'}</div>
                                <div className="mt-4"><span className="text-purple-400">async function</span> <span className="text-yellow-300">buildFuture</span>() {'{'}</div>
                                <div className="pl-6"><span className="text-purple-400">await</span> <span className="text-cyan-300">learn</span>();</div>
                                <div className="pl-6"><span className="text-purple-400">await</span> <span className="text-cyan-300">practice</span>();</div>
                                <div className="pl-6"><span className="text-purple-400">return</span> <span className="text-amber-300">"Success!"</span>;</div>
                                <div>{'}'}</div>
                                <div className="mt-4 text-green-400">{'// Your journey starts here'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dashboard Section — only shown when logged in */}
            {user && (
                <section className="pb-24 px-6 pt-4" style={{ background: 'var(--section-bg)' }}>
                    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">

                        {/* Continue Learning / Your Courses */}
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-bold">
                                    {user.role === 'professor' ? 'Your Courses' : 'Continue Learning'}
                                </h2>
                                <Link
                                    to={user.role === 'professor' ? '/professor' : '/my-courses'}
                                    className="text-sm no-underline opacity-60 hover:opacity-100 transition-opacity"
                                    style={{ color: '#fef483' }}
                                >
                                    View all →
                                </Link>
                            </div>

                            {loadingCourses ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="surface-card rounded-xl p-4 animate-pulse h-16" />
                                    ))}
                                </div>
                            ) : courses.length === 0 ? (
                                <div className="surface-card rounded-xl p-8 text-center opacity-60">
                                    <p className="mb-3">No courses yet.</p>
                                    <Link
                                        to={user.role === 'professor' ? '/professor/create-course' : '/courses'}
                                        className="text-sm no-underline"
                                        style={{ color: '#fef483' }}
                                    >
                                        {user.role === 'professor' ? 'Create your first course →' : 'Browse available courses →'}
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {courses.map(course => (
                                        <Link
                                            key={course.id}
                                            to={user.role === 'professor' ? `/professor/course/${course.id}` : `/my-courses/${course.id}`}
                                            className="surface-card card-hover rounded-xl p-4 flex items-center gap-4 no-underline group"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-sm"
                                                style={{ background: 'linear-gradient(135deg, rgba(161,96,157,0.3), rgba(254,244,131,0.2))', color: '#fef483' }}
                                            >
                                                {course.title?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white truncate group-hover:opacity-90">{course.title}</p>
                                                {user.role === 'student' && course.progress !== undefined && (
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{ width: `${course.progress || 0}%`, background: 'linear-gradient(90deg, #a1609d, #fef483)' }}
                                                            />
                                                        </div>
                                                        <span className="text-xs opacity-50 flex-shrink-0">{Math.round(course.progress || 0)}%</span>
                                                    </div>
                                                )}
                                                {user.role === 'professor' && (
                                                    <p className="text-xs opacity-50 mt-0.5">{course.student_count ?? 0} students</p>
                                                )}
                                            </div>
                                            <span className="opacity-30 group-hover:opacity-70 transition-opacity">→</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Upcoming Events */}
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-bold">Upcoming</h2>
                                <Link
                                    to="/calendar"
                                    className="text-sm no-underline opacity-60 hover:opacity-100 transition-opacity"
                                    style={{ color: '#fef483' }}
                                >
                                    View calendar →
                                </Link>
                            </div>

                            {loadingEvents ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="surface-card rounded-xl p-4 animate-pulse h-16" />
                                    ))}
                                </div>
                            ) : events.length === 0 ? (
                                <div className="surface-card rounded-xl p-8 text-center opacity-60">
                                    <p className="mb-3">Nothing coming up in the next 7 days.</p>
                                    <Link to="/calendar" className="text-sm no-underline" style={{ color: '#fef483' }}>
                                        Open calendar →
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {events.map(event => {
                                        const color = EVENT_COLORS[event.event_type] || EVENT_COLORS.custom;
                                        const label = EVENT_LABELS[event.event_type] || 'Event';
                                        return (
                                            <Link
                                                key={event.id}
                                                to="/calendar"
                                                className="surface-card card-hover rounded-xl p-4 flex items-center gap-4 no-underline group"
                                            >
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white truncate group-hover:opacity-90">{event.title}</p>
                                                    <p className="text-xs opacity-50 mt-0.5">{label}</p>
                                                </div>
                                                <span
                                                    className="text-xs font-medium flex-shrink-0 px-2.5 py-1 rounded-lg"
                                                    style={{ background: `${color}25`, color }}
                                                >
                                                    {formatEventDate(event.start_datetime)}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="Note G" className="w-16 h-16" />
                            <span className="font-bold text-white">Note G</span>
                        </div>
                        <p className="text-sm opacity-50">© 2024 Note G. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

function App() {
    return (
        <Router>
            <ThemeProvider>
            <AuthProvider>
                <NotificationProvider>
                <AnimatedBackground />
                <ErrorBoundary>
                <Routes>
                    {/* Public routes - no navbar */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/get-started" element={<RoleSelection />} />

                    {/* Public routes - with navbar */}
                    <Route path="/student" element={<Layout><Home /></Layout>} />
                    <Route path="/login" element={<Layout><Login /></Layout>} />
                    <Route path="/register" element={<Layout><Register /></Layout>} />
                    <Route path="/verify-email" element={<Layout><VerifyEmail /></Layout>} />
                    <Route path="/verification-pending" element={<Layout><VerificationPending /></Layout>} />
                    <Route path="/resend-verification" element={<Layout><ResendVerification /></Layout>} />
                    <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
                    <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
                    <Route path="/choose-username" element={<Layout><ChooseUsername /></Layout>} />

                    {/* Authenticated routes - student */}
                    <Route path="/profile" element={<RequireAuth><Layout padding={null}><Profile /></Layout></RequireAuth>} />
                    <Route path="/courses" element={<RequireAuth><Layout><Courses /></Layout></RequireAuth>} />
                    <Route path="/courses/:id" element={<Layout padding="pt-24"><CourseDetail /></Layout>} />
                    <Route path="/exercises/:id" element={<Layout padding="pt-20"><Exercise /></Layout>} />
                    <Route path="/my-courses" element={<RequireAuth><Layout><MyCourses /></Layout></RequireAuth>} />
                    <Route path="/my-courses/:courseId" element={<RequireAuth><Layout padding="pt-24"><MyCourseDetail /></Layout></RequireAuth>} />
                    <Route path="/my-analytics" element={<RequireAuth><Layout><StudentAnalytics /></Layout></RequireAuth>} />
                    <Route path="/calendar" element={<RequireAuth><Layout><Calendar /></Layout></RequireAuth>} />
                    <Route path="/notifications" element={<RequireAuth><Layout><Notifications /></Layout></RequireAuth>} />
                    <Route path="/years" element={<Layout><YearsClasses /></Layout>} />
                    <Route path="/class/:classId" element={<Layout><ClassDetail /></Layout>} />
                    <Route path="/professor/enrollment-requests" element={<RequireAuth role="professor"><Layout><EnrollmentRequests /></Layout></RequireAuth>} />
                    <Route path="/lectures/:lectureId" element={<RequireAuth><LectureViewer /></RequireAuth>} />

                    {/* Authenticated routes - professor */}
                    <Route path="/professor" element={<RequireAuth role="professor"><Layout><ProfessorDashboard /></Layout></RequireAuth>} />
                    <Route path="/professor/create-course" element={<RequireAuth role="professor"><Layout><CreateCourse /></Layout></RequireAuth>} />
                    <Route path="/professor/course/:id" element={<RequireAuth role="professor"><Layout><EditCourse /></Layout></RequireAuth>} />
                    <Route path="/professor/exercise/:id" element={<RequireAuth role="professor"><Layout><EditExercise /></Layout></RequireAuth>} />
                    <Route path="/professor/course/:id/students" element={<RequireAuth role="professor"><Layout><CourseStudents /></Layout></RequireAuth>} />
                    <Route path="/professor/course/:courseId/exercise/:exerciseId/students" element={<RequireAuth role="professor"><Layout><ExerciseAttempts /></Layout></RequireAuth>} />
                    <Route path="/professor/plagiarism" element={<RequireAuth role="professor"><Layout><PlagiarismDashboard /></Layout></RequireAuth>} />
                    <Route path="/professor/plagiarism/report/:reportId" element={<RequireAuth role="professor"><Layout><PlagiarismReport /></Layout></RequireAuth>} />
                    <Route path="/professor/course/:courseId/lecture/create" element={<RequireAuth role="professor"><CreateEditLecture /></RequireAuth>} />
                    <Route path="/professor/course/:courseId/lecture/:lectureId/edit" element={<RequireAuth role="professor"><CreateEditLecture /></RequireAuth>} />
                </Routes>
                </ErrorBoundary>
                </NotificationProvider>
            </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}

export default App;
