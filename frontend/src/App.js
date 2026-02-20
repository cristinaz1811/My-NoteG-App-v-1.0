import React from 'react';
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

const Home = () => {
    return (
        <div className="min-h-screen pt-20">
            {/* Hero Section */}
            <section className="min-h-[calc(100vh-5rem)] flex items-center px-6 py-12">
                <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div className="animate-slideUp">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6" 
                             style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
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
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link 
                                to="/register" 
                                className="px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 glow gradient-bg text-white text-center no-underline"
                            >
                                Start Learning Free
                            </Link>
                            <Link 
                                to="/courses" 
                                className="px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:bg-white/10 flex items-center justify-center gap-2 no-underline text-white"
                                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                            >
                                Browse Courses
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 mt-10">
                            <div className="flex -space-x-3">
                                <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0f] bg-gradient-to-br from-pink-500 to-purple-500"></div>
                                <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0f] bg-gradient-to-br from-cyan-500 to-blue-500"></div>
                                <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0f] bg-gradient-to-br from-green-500 to-emerald-500"></div>
                                <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0f] bg-gradient-to-br from-orange-500 to-red-500"></div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 text-yellow-400">
                                    <span>★★★★★</span>
                                </div>
                                <p className="text-sm opacity-70">4.9/5 from 2,500+ reviews</p>
                            </div>
                        </div>
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
            <section className="py-24 px-6" style={{ background: 'var(--surface-color)' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Why Learn With <span className="gradient-text">CodeCraft</span>
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
                                     style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(34, 211, 238, 0.2))' }}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                <p className="opacity-70">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="rounded-3xl p-8 sm:p-12 text-center glow"
                         style={{ background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.2), rgba(34, 211, 238, 0.1))', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Start Coding?</h2>
                        <p className="text-lg opacity-80 mb-8 max-w-xl mx-auto">
                            Join thousands of developers who have transformed their careers with CodeCraft.
                        </p>
                        <Link 
                            to="/register"
                            className="inline-block px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 gradient-bg text-white no-underline"
                        >
                            Start Learning Free
                        </Link>
                        <p className="text-sm opacity-50 mt-4">No credit card required • Cancel anytime</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-bg">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>
                            <span className="font-bold text-white">CodeCraft</span>
                        </div>
                        <p className="text-sm opacity-50">© 2024 CodeCraft. All rights reserved.</p>
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
                <Navbar />
                <div className="pt-16">
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
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App;
