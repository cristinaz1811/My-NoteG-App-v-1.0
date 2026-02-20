import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1f28 0%, #252c38 50%, #1a1f28 100%)' }}>
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
                    ✨ Join thousands of students and educators learning together
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
                        to="/register"
                        className="surface-card card-hover p-8 rounded-2xl text-left group no-underline"
                    >
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-4xl"
                             style={{ background: 'linear-gradient(135deg, rgba(254, 244, 131, 0.2), rgba(161, 96, 157, 0.2))' }}>
                            🎓
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
                    <div 
                        className="surface-card p-8 rounded-2xl text-left opacity-60 cursor-not-allowed relative overflow-hidden"
                    >
                        {/* Coming Soon Badge */}
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
                             style={{ background: 'rgba(254, 244, 131, 0.2)', color: '#fef483' }}>
                            Coming Soon
                        </div>
                        
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-4xl"
                             style={{ background: 'linear-gradient(135deg, rgba(161, 96, 157, 0.2), rgba(184, 138, 181, 0.2))' }}>
                            👨‍🏫
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-white">
                            I'm a Professor
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Create courses, design exercises, and track your students' progress in real-time.
                        </p>
                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                            <span>Available Soon</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-sm text-gray-500 mt-12">
                    Already have an account? <Link to="/login" className="text-[#fef483] hover:text-[#fff9c4]">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

const Home = () => {
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
                                <div className="pl-6"><span className="text-purple-400">return</span> <span className="text-amber-300">"🚀 Success!"</span>;</div>
                                <div>{'}'}</div>
                                <div className="mt-4 text-green-400">{'// Your journey starts here'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="pt-12 pb-24 px-6" style={{ background: 'rgba(35, 42, 54, 0.6)' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Why Learn With <span className="gradient-text">Note G</span>
                        </h2>
                        <p className="text-lg opacity-70 max-w-2xl mx-auto">
                            Everything you need to go from zero to professional developer, all in one place.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: '💻', title: 'Interactive Coding', desc: 'Write real code in your browser with instant feedback and guided hints.' },
                            { icon: '🚀', title: 'Project-Based Learning', desc: 'Build real projects for your portfolio while learning new skills.' },
                            { icon: '🤖', title: 'AI-Powered Help', desc: 'Get instant answers and explanations from our intelligent coding assistant.' },
                            { icon: '👥', title: 'Community Support', desc: 'Connect with fellow learners and mentors in our active community.' },
                            { icon: '🎖️', title: 'Certificates', desc: 'Earn recognized certificates to showcase your skills to employers.' },
                            { icon: '⏰', title: 'Learn at Your Pace', desc: 'Flexible schedules that fit your life. Learn anytime, anywhere.' },
                        ].map((feature, idx) => (
                            <div key={idx} className="card-hover p-8 rounded-2xl surface-card">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-3xl"
                                     style={{ background: 'linear-gradient(135deg, rgba(161, 96, 157, 0.2), rgba(254, 244, 131, 0.2))' }}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                <p className="opacity-70">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

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
            <AuthProvider>
                <AnimatedBackground />
                <Routes>
                    {/* Landing Page - No Navbar */}
                    <Route path="/" element={<LandingPage />} />
                    
                    {/* Role Selection - No Navbar */}
                    <Route path="/get-started" element={<RoleSelection />} />
                    
                    {/* Student Routes - With Navbar */}
                    <Route path="/student" element={<><Navbar /><div className="pt-16"><Home /></div></>} />
                    <Route path="/login" element={<><Navbar /><div className="pt-16"><Login /></div></>} />
                    <Route path="/register" element={<><Navbar /><div className="pt-16"><Register /></div></>} />
                    <Route 
                        path="/courses" 
                        element={
                            <ProtectedRoute>
                                <Navbar /><div className="pt-16"><Courses /></div>
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/courses/:id" 
                        element={
                            <ProtectedRoute>
                                <Navbar /><div className="pt-24"><CourseDetail /></div>
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/exercises/:id" 
                        element={
                            <ProtectedRoute>
                                <Navbar /><div className="pt-20"><Exercise /></div>
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/my-courses" 
                        element={
                            <ProtectedRoute>
                                <Navbar /><div className="pt-16"><MyCourses /></div>
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/my-courses/:courseId" 
                        element={
                            <ProtectedRoute>
                                <Navbar /><div className="pt-24"><MyCourseDetail /></div>
                            </ProtectedRoute>
                        } 
                    />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
