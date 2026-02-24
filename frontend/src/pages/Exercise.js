import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { exerciseService, notificationService } from '../services/api';
import SubmissionHistory from '../components/SubmissionHistory';

const Exercise = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exercise, setExercise] = useState(null);
    const [code, setCode] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const editorRef = useRef(null);
    const isMountedRef = useRef(true);

    // Multi-file state
    const [fileContents, setFileContents] = useState({}); // { filename: code }
    const [activeFile, setActiveFile] = useState(null);   // current tab filename

    // Panel state
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [showHistoryPanel, setShowHistoryPanel] = useState(false);
    const historyRefreshRef = useRef(0);

    // AI Hints state
    const [hints, setHints] = useState([
        { number: 1, text: null, unlocked: false },
        { number: 2, text: null, unlocked: false },
        { number: 3, text: null, unlocked: false },
    ]);
    const [hintsUnlocked, setHintsUnlocked] = useState(0);
    const [attemptsUntilNextHint, setAttemptsUntilNextHint] = useState(2);
    const [loadingHint, setLoadingHint] = useState(null);
    const [complexity, setComplexity] = useState(null);
    const [analyzingComplexity, setAnalyzingComplexity] = useState(false);
    const [hintMode, setHintMode] = useState('solving'); // 'solving' or 'optimizing'
    const [expandedHints, setExpandedHints] = useState({});

    // Help request state
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [helpMessage, setHelpMessage] = useState('');
    const [helpSending, setHelpSending] = useState(false);
    const [helpSent, setHelpSent] = useState(false);

    // Timer / Quiz mode state
    const [timedSession, setTimedSession] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null); // seconds
    const [timerExpired, setTimerExpired] = useState(false);
    const [showTimerStartModal, setShowTimerStartModal] = useState(false);
    const timerIntervalRef = useRef(null);

    const handleRequestHelp = async () => {
        if (helpSending) return;
        setHelpSending(true);
        try {
            await notificationService.requestHelp(id, helpMessage);
            setHelpSent(true);
            setHelpMessage('');
            setTimeout(() => {
                setShowHelpModal(false);
                setHelpSent(false);
            }, 2000);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to send help request');
        } finally {
            setHelpSending(false);
        }
    };

    // Timer helper: format seconds as MM:SS
    const formatTimer = (seconds) => {
        if (seconds == null || seconds < 0) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Start countdown interval from a session
    const startCountdown = useCallback((session) => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        const expiresAt = new Date(session.expires_at).getTime();

        const tick = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
            setTimeRemaining(remaining);
            if (remaining <= 0) {
                setTimerExpired(true);
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
        tick();
        timerIntervalRef.current = setInterval(tick, 1000);
    }, []);

    // Handle starting a timed session
    const handleStartTimer = async () => {
        try {
            const response = await exerciseService.startTimedSession(id);
            setTimedSession(response.data);
            setShowTimerStartModal(false);
            if (response.data.time_expired) {
                setTimerExpired(true);
            } else {
                startCountdown(response.data);
            }
        } catch (error) {
            console.error('Error starting timed session:', error);
            alert(error.response?.data?.error || 'Failed to start timer');
        }
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, []);

    // Cleanup editor on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (editorRef.current) {
                try {
                    editorRef.current.dispose();
                } catch (e) {
                    // Ignore disposal errors
                }
                editorRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        loadExercise();
    }, [id]);

    const loadExercise = async () => {
        try {
            const response = await exerciseService.getExerciseById(id);
            setExercise(response.data);
            
            // Initialize code state
            if (response.data.is_multi_file && response.data.exerciseFiles?.length > 0) {
                // Multi-file: initialize file contents from exercise files
                const contents = {};
                response.data.exerciseFiles.forEach(f => {
                    contents[f.filename] = (f.starter_code || '').replace(/\\n/g, '\n');
                });
                setFileContents(contents);
                // Set active file to entry point or first file
                const entryFile = response.data.exerciseFiles.find(f => f.is_entry_point) || response.data.exerciseFiles[0];
                setActiveFile(entryFile.filename);
                setCode((entryFile.starter_code || '').replace(/\\n/g, '\n'));
            } else {
                // Single-file
                const starterCode = response.data.starter_code || '';
                setCode(starterCode.replace(/\\n/g, '\n'));
            }
            
            // Set initial hint mode based on completion status
            const status = response.data.userProgress?.completion_status;
            if (status === 'completed') {
                setHintMode('solved');
            } else if (status === 'inefficient') {
                setHintMode('optimizing');
            }

            // Handle timed exercise session
            if (response.data.time_limit_minutes) {
                const sessionData = response.data.timedSession;
                if (sessionData) {
                    setTimedSession(sessionData);
                    if (sessionData.time_expired || new Date() > new Date(sessionData.expires_at)) {
                        setTimerExpired(true);
                    } else {
                        startCountdown(sessionData);
                    }
                } else {
                    // No session yet — show start modal
                    setShowTimerStartModal(true);
                }
            }
        } catch (error) {
            console.error('Error loading exercise:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load AI hints status
    const loadHintsStatus = useCallback(async (mode) => {
        const m = mode || hintMode;
        try {
            const response = await exerciseService.getAIHints(id, m);
            const data = response.data;
            setHints(data.hints);
            setHintsUnlocked(data.hintsUnlocked);
            setAttemptsUntilNextHint(data.attemptsUntilNextHint);
        } catch (error) {
            console.error('Error loading hints:', error);
        }
    }, [id, hintMode]);

    // Load hints when panel is opened
    useEffect(() => {
        if (showAIPanel) {
            loadHintsStatus();
        }
    }, [showAIPanel, loadHintsStatus]);

    // Generate a specific hint
    const handleGenerateHint = async (hintNumber) => {
        setLoadingHint(hintNumber);
        try {
            const failedTests = results?.results?.filter(r => !r.passed)?.slice(0, 3).map(r => ({
                input: r.input,
                expected: r.expected,
                actual: r.actual || r.error || 'No output',
            })) || [];

            const response = await exerciseService.generateAIHint(id, {
                hintNumber,
                code,
                failedTests,
                mode: hintMode,
                currentComplexity: complexity ? `${complexity.timeComplexity} time, ${complexity.spaceComplexity} space` : undefined,
                optimalComplexity: complexity ? `${complexity.optimalTimeComplexity} time, ${complexity.optimalSpaceComplexity} space` : undefined,
            });

            setHints(prev => prev.map(h =>
                h.number === hintNumber
                    ? { ...h, text: response.data.hint, unlocked: true, needsGeneration: false }
                    : h
            ));
            // Auto-expand the hint after generation
            setExpandedHints(prev => ({ ...prev, [hintNumber]: true }));
        } catch (error) {
            console.error('Error generating hint:', error);
        } finally {
            setLoadingHint(null);
        }
    };

    const handleSubmit = async () => {
        // Block submission if timer expired
        if (timerExpired) {
            alert('Time has expired for this exercise. You can no longer submit solutions.');
            return;
        }
        // Block if timed exercise but timer not started
        if (exercise?.time_limit_minutes && !timedSession) {
            setShowTimerStartModal(true);
            return;
        }

        setSubmitting(true);
        setResults(null);

        try {
            // Build submission data
            const submitData = {
                language: exercise.language,
            };
            
            if (exercise.is_multi_file && exercise.exerciseFiles?.length > 0) {
                // Multi-file: send all files with their current code
                submitData.files = exercise.exerciseFiles.map(f => ({
                    filename: f.filename,
                    code: fileContents[f.filename] || '',
                    is_entry_point: f.is_entry_point,
                }));
                submitData.code = submitData.files.map(f => f.code).join('\n');
            } else {
                submitData.code = code;
            }
            
            const response = await exerciseService.submitSolution(id, submitData);
            setResults(response.data);
            
            const { score, testsPassed, testsTotal } = response.data;
            const allPassed = testsPassed === testsTotal;
            setExercise(prev => {
                const prevStatus = prev.userProgress?.completion_status || 'in_progress';
                let newStatus = prevStatus;
                if (allPassed && prevStatus === 'in_progress') {
                    newStatus = prev.requires_efficiency ? 'inefficient' : 'completed';
                }
                return {
                    ...prev,
                    userProgress: {
                        ...prev.userProgress,
                        best_score: Math.max(prev.userProgress?.best_score || 0, score),
                        attempts: (prev.userProgress?.attempts || 0) + 1,
                        completed: allPassed || prev.userProgress?.completed,
                        completion_status: newStatus,
                    }
                };
            });

            // Refresh hints status after each submission (new hints may unlock)
            if (showAIPanel) {
                setTimeout(() => loadHintsStatus(), 500);
            }

            // Refresh history panel
            historyRefreshRef.current += 1;

            // Auto-analyze complexity only when ALL tests pass
            if (testsPassed === testsTotal && code && code.trim().length > 0) {
                setAnalyzingComplexity(true);
                try {
                    const complexityRes = await exerciseService.getComplexityAnalysis(id, { code });
                    setComplexity(complexityRes.data);
                    if (!showAIPanel) setShowAIPanel(true);

                    if (complexityRes.data.isOptimal) {
                        // Optimal! Update status accordingly
                        setExercise(prev => ({
                            ...prev,
                            userProgress: {
                                ...prev.userProgress,
                                completion_status: 'completed',
                                best_score: prev.requires_efficiency ? 100 : prev.userProgress?.best_score,
                                efficiency_star: !prev.requires_efficiency ? true : prev.userProgress?.efficiency_star,
                            }
                        }));
                        setHintMode('solved');
                    } else if (!complexityRes.data.isOptimal) {
                        // Not optimal — switch to optimization hints
                        setHintMode('optimizing');
                        setHints([
                            { number: 1, text: null, unlocked: false },
                            { number: 2, text: null, unlocked: false },
                            { number: 3, text: null, unlocked: false },
                        ]);
                        setHintsUnlocked(0);
                        setTimeout(() => loadHintsStatus('optimizing'), 500);
                    }
                } catch (err) {
                    console.error('Auto complexity analysis failed:', err);
                } finally {
                    setAnalyzingComplexity(false);
                }
            } else if (testsPassed !== testsTotal) {
                // Reset complexity and go back to solving mode
                setComplexity(null);
                if (hintMode !== 'solving') {
                    setHintMode('solving');
                    setHints([
                        { number: 1, text: null, unlocked: false },
                        { number: 2, text: null, unlocked: false },
                        { number: 3, text: null, unlocked: false },
                    ]);
                    setHintsUnlocked(0);
                    setTimeout(() => loadHintsStatus('solving'), 500);
                }
            }
        } catch (error) {
            console.error('Error submitting solution:', error);
            // Handle timed expiry from backend
            if (error.response?.data?.timeExpired) {
                setTimerExpired(true);
                setTimeRemaining(0);
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }
            }
            setResults({
                score: 0,
                testsPassed: 0,
                testsTotal: 0,
                results: [{
                    passed: false,
                    input: '',
                    expected: '',
                    actual: '',
                    error: error.response?.data?.error || error.response?.data?.details || 'Failed to submit solution'
                }]
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getDifficultyBadgeClass = (difficulty) => {
        switch(difficulty) {
            case 'beginner': return 'badge-beginner';
            case 'intermediate': return 'badge-intermediate';
            case 'advanced': return 'badge-advanced';
            default: return 'badge-beginner';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading exercise...</p>
                </div>
            </div>
        );
    }

    if (!exercise) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h2 className="text-2xl font-bold mb-2">Exercise not found</h2>
                    <button onClick={() => navigate(-1)} className="btn-primary mt-4">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 4rem)', overflow: 'hidden' }}>
            {/* Left Panel - Description */}
            <div className={`${(showAIPanel || showHistoryPanel) ? 'lg:w-[30%]' : 'lg:w-1/2 xl:w-2/5'} p-6 overflow-y-auto bg-[#0a0a0f] border-r border-white/5 transition-all duration-300`}>
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                >
                    <span>←</span> Back
                </button>

                {/* Exercise Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className={`badge ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                            {exercise.difficulty}
                        </span>
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                            {exercise.language}
                        </span>
                        {exercise.time_limit_minutes && (
                            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded flex items-center gap-1">
                                ⏱ {exercise.time_limit_minutes} min
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold">{exercise.title}</h1>
                </div>

                {/* Description */}
                <div className="surface-card rounded-xl p-5 mb-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Description</h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{exercise.description}</p>
                </div>

                {/* Test Cases */}
                <div className="surface-card rounded-xl p-5 mb-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Example Test Cases</h3>
                    <div className="space-y-4">
                        {exercise.testCases?.map((testCase, index) => (
                            <div key={testCase.id} className="bg-black/20 rounded-lg p-4 border border-white/5">
                                <div className="text-sm text-gray-500 mb-2">Test Case {index + 1}</div>
                                <div className="space-y-2 font-mono text-sm">
                                    <div>
                                        <span className="text-gray-500">Input: </span>
                                        <span className="text-[#fef483]">{testCase.input}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Expected: </span>
                                        <span className="text-green-400">{testCase.expected_output}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* User Progress */}
                <div className="surface-card rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Your Progress</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold gradient-text">{exercise.userProgress?.best_score || 0}%</div>
                            <div className="text-xs text-gray-500">Best Score</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold gradient-text">{exercise.userProgress?.attempts || 0}</div>
                            <div className="text-xs text-gray-500">Attempts</div>
                        </div>
                        <div>
                            {(() => {
                                const status = exercise.userProgress?.completion_status || 'in_progress';
                                const star = exercise.userProgress?.efficiency_star;
                                if (status === 'completed') return (
                                    <>
                                        <div className="text-2xl text-green-400">✓{star ? ' ⭐' : ''}</div>
                                        <div className="text-xs text-green-400">Completed{star ? ' (Optimal)' : ''}</div>
                                    </>
                                );
                                if (status === 'inefficient') return (
                                    <>
                                        <div className="text-2xl text-amber-400">⚠</div>
                                        <div className="text-xs text-amber-400">Needs Optimization</div>
                                    </>
                                );
                                return (
                                    <>
                                        <div className="text-2xl text-gray-500">○</div>
                                        <div className="text-xs text-gray-500">In Progress</div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                    {exercise.requires_efficiency && (
                        <div className="mt-3 pt-3 border-t border-white/5 text-center">
                            <span className="text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-1 rounded-full">⚡ Efficiency Required</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Center Panel - Editor */}
            <div className={`${(showAIPanel || showHistoryPanel) ? 'lg:w-[45%]' : 'lg:w-1/2 xl:w-3/5'} flex flex-col bg-[#1e242e] transition-all duration-300`} style={{ height: '100%', overflow: 'hidden' }}>
                {/* Editor Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#232a36]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        {/* Show active filename or default */}
                        {exercise.is_multi_file && exercise.exerciseFiles?.length > 0 ? (
                            <span className="text-sm text-gray-400 font-mono">
                                {activeFile || exercise.exerciseFiles[0]?.filename}
                            </span>
                        ) : (
                        <span className="text-sm text-gray-400 font-mono">
                            solution.{
                                exercise.language === 'python' ? 'py' : 
                                exercise.language === 'javascript' ? 'js' : 
                                exercise.language === 'java' ? 'java' :
                                exercise.language === 'cpp' ? 'cpp' :
                                exercise.language === 'csharp' ? 'cs' :
                                exercise.language
                            }
                        </span>
                        )}
                        {exercise.is_multi_file && (
                            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                                Multi-File
                            </span>
                        )}
                        {/* Timer Display */}
                        {exercise.time_limit_minutes && timedSession && !timerExpired && timeRemaining != null && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-mono font-bold ${
                                timeRemaining <= 60 ? 'bg-red-500/20 text-red-400 animate-pulse' :
                                timeRemaining <= 300 ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-300'
                            }`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                {formatTimer(timeRemaining)}
                            </div>
                        )}
                        {exercise.time_limit_minutes && timerExpired && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-red-500/20 text-red-400">
                                ⏰ Time's Up!
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHelpModal(true)}
                            className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-white/5 text-gray-400 hover:text-orange-300 hover:bg-orange-500/10 border border-white/10"
                            title="Request help from professor"
                        >
                            🆘 Help
                        </button>
                        <button
                            onClick={() => { setShowHistoryPanel(!showHistoryPanel); if (!showHistoryPanel) setShowAIPanel(false); }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                showHistoryPanel
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                            }`}
                            title="Submission History"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            History
                        </button>
                        <button
                            onClick={() => setShowHelpModal(true)}
                            className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-white/5 text-gray-400 hover:text-orange-300 hover:bg-orange-500/10 border border-white/10"
                            title="Request help from professor"
                        >
                            🆘 Help
                        </button>
                        <button
                            onClick={() => { setShowAIPanel(!showAIPanel); if (!showAIPanel) setShowHistoryPanel(false); }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                showAIPanel
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                            }`}
                            title="AI Assistant"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/>
                                <path d="M9 14v1a3 3 0 0 0 6 0v-1"/>
                                <line x1="9" y1="9" x2="9.01" y2="9"/>
                                <line x1="15" y1="9" x2="15.01" y2="9"/>
                                <path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H5v-2z"/>
                            </svg>
                            AI
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || timerExpired}
                            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                                submitting || timerExpired
                                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                                    : 'gradient-bg hover:opacity-90'
                            }`}
                        >
                            {timerExpired ? (
                                '⏰ Time Expired'
                            ) : submitting ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Running...
                                </span>
                            ) : (
                                '▶ Run Code'
                            )}
                        </button>
                    </div>
                </div>

                {/* Multi-file Tabs */}
                {exercise.is_multi_file && exercise.exerciseFiles?.length > 0 && (
                    <div className="flex items-center border-b border-white/5 bg-[#1a1f2b] overflow-x-auto">
                        {exercise.exerciseFiles.map((file) => (
                            <button
                                key={file.filename}
                                onClick={() => {
                                    // Save current file's code before switching
                                    if (activeFile) {
                                        setFileContents(prev => ({ ...prev, [activeFile]: code }));
                                    }
                                    setActiveFile(file.filename);
                                    setCode(fileContents[file.filename] || '');
                                }}
                                className={`px-4 py-2 text-xs font-mono whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
                                    activeFile === file.filename
                                        ? 'border-[#a1609d] text-white bg-[#1e242e]'
                                        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                {file.is_entry_point && (
                                    <span className="text-[9px] text-green-400" title="Entry point">▶</span>
                                )}
                                {file.filename}
                            </button>
                        ))}
                    </div>
                )}

                {/* Monaco Editor */}
                <div style={{ flex: results ? '0 0 40%' : '1 1 auto', minHeight: '200px', overflow: 'hidden' }}>
                    <Editor
                        height="100%"
                        language={exercise.language}
                        value={code}
                        onChange={(value) => { 
                            if (isMountedRef.current) {
                                setCode(value || '');
                                // Keep fileContents in sync for multi-file
                                if (exercise.is_multi_file && activeFile) {
                                    setFileContents(prev => ({ ...prev, [activeFile]: value || '' }));
                                }
                            }
                        }}
                        onMount={(editor) => { 
                            if (isMountedRef.current) {
                                editorRef.current = editor;
                                const textArea = editor.getDomNode()?.querySelector('textarea');
                                if (textArea) {
                                    textArea.setAttribute('autocomplete', 'off');
                                    textArea.setAttribute('autocorrect', 'off');
                                    textArea.setAttribute('autocapitalize', 'off');
                                    textArea.setAttribute('spellcheck', 'false');
                                    textArea.setAttribute('data-form-type', 'other');
                                }
                            }
                        }}
                        theme="vs-dark"
                        options={{
                            fontSize: 14,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            padding: { top: 16, bottom: 16 },
                            lineNumbers: 'on',
                            renderLineHighlight: 'line',
                            cursorBlinking: 'smooth',
                            smoothScrolling: true,
                            tabSize: 4,
                        }}
                    />
                </div>

                {/* Results Panel */}
                {results && (
                    <div className="border-t border-white/5 bg-[#0a0a0f] overflow-y-auto" style={{ flex: '1 1 60%' }}>
                        {/* Results Header */}
                        <div className={`px-4 py-3 border-b border-white/5 ${
                            (results.score || 0) === 100 ? 'bg-green-500/10' : 'bg-amber-500/10'
                        }`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    {(results.score || 0) === 100 ? (
                                        <>
                                            <span className="text-green-400">✓</span>
                                            <span className="text-green-400">All Tests Passed!</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-amber-400">⚠</span>
                                            <span className="text-amber-400">{results.testsPassed || 0}/{results.testsTotal || 0} Tests Passed</span>
                                        </>
                                    )}
                                </h3>
                                <span className={`text-lg font-bold ${
                                    (results.score || 0) === 100 ? 'text-green-400' : 'text-amber-400'
                                }`}>
                                    {(results.score || 0).toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        {/* Test Results */}
                        <div className="p-4 space-y-3">
                            {results.results && results.results.length > 0 ? results.results.map((result, index) => (
                                <div
                                    key={index}
                                    className={`rounded-lg p-4 ${
                                        result.passed 
                                            ? 'bg-green-500/5 border border-green-500/20' 
                                            : 'bg-red-500/5 border border-red-500/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                                            {result.passed ? '✓' : '✗'}
                                        </span>
                                        <span className="font-medium text-sm">
                                            Test Case {index + 1}: {result.passed ? 'Passed' : 'Failed'}
                                        </span>
                                        {result.executionTime && (
                                            <span className="text-xs text-gray-500 ml-auto">
                                                {result.executionTime}ms
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-mono text-xs space-y-1 text-gray-400">
                                        <div>
                                            <span className="text-gray-500">Input: </span>
                                            <span className="text-gray-300">{result.input}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Expected: </span>
                                            <span className="text-green-400">{result.expected}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Output: </span>
                                            <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                                                {result.actual || result.error || 'No output'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-gray-400 text-center py-4">
                                    {results.error || 'No test results available'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel - Submission History */}
            {showHistoryPanel && (
                <div className="lg:w-[25%] flex flex-col bg-[#0d0f15] border-l border-white/5 overflow-hidden" style={{ height: '100%' }}>
                    {/* History Panel Header */}
                    <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <span className="text-blue-400">⏱</span>
                                Submission History
                            </h3>
                            <button
                                onClick={() => setShowHistoryPanel(false)}
                                className="text-gray-500 hover:text-white transition-colors text-lg"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    <SubmissionHistory
                        key={historyRefreshRef.current}
                        exerciseId={id}
                        exerciseService={exerciseService}
                        starterCode={(exercise?.starter_code || '').replace(/\\n/g, '\n')}
                        onLoadCode={(loadedCode) => {
                            // Handle multi-file submissions (stored as JSON)
                            if (exercise?.is_multi_file) {
                                try {
                                    const parsedFiles = JSON.parse(loadedCode);
                                    if (Array.isArray(parsedFiles)) {
                                        const contents = {};
                                        parsedFiles.forEach(f => { contents[f.filename] = f.code || ''; });
                                        setFileContents(contents);
                                        // Load the active file's code into the editor
                                        const active = activeFile || Object.keys(contents)[0];
                                        setActiveFile(active);
                                        setCode(contents[active] || '');
                                        return;
                                    }
                                } catch (e) {
                                    // Not JSON, fall through to single-file load
                                }
                            }
                            setCode(loadedCode);
                        }}
                    />
                </div>
            )}

            {/* Right Panel - AI Assistant */}
            {showAIPanel && (
                <div className="lg:w-[25%] flex flex-col bg-[#0d0f15] border-l border-white/5 overflow-hidden" style={{ height: '100%' }}>
                    {/* AI Panel Header */}
                    <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <span className="text-purple-400">✦</span>
                                AI Assistant
                            </h3>
                            <button
                                onClick={() => setShowAIPanel(false)}
                                className="text-gray-500 hover:text-white transition-colors text-lg"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Hints Section */}
                        <div>
                            {hintMode === 'solved' ? (
                                /* Completed state — no hints needed */
                                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 text-center">
                                    <div className="text-4xl mb-3">{exercise.userProgress?.efficiency_star || exercise.requires_efficiency ? '⭐' : '🎉'}</div>
                                    <h4 className="font-semibold text-green-300 mb-1">Exercise Completed!</h4>
                                    <p className="text-xs text-gray-400">
                                        {exercise.requires_efficiency 
                                            ? 'You achieved the optimal solution. Full marks awarded.'
                                            : exercise.userProgress?.efficiency_star
                                                ? 'Great work! You also achieved optimal complexity.'
                                                : 'All tests passed. Well done!'}
                                    </p>
                                </div>
                            ) : (
                                /* Active hints */
                                <>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <span>{hintMode === 'optimizing' ? '⚡' : '💡'}</span> {hintMode === 'optimizing' ? 'Optimization Hints' : 'Progressive Hints'}
                                    </h4>
                                    {hintMode === 'optimizing' && (
                                        <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                                            <p className="text-[10px] text-amber-300">Your solution works but isn't optimal. Hints now guide you toward a more efficient approach.</p>
                                        </div>
                                    )}
                            <div className="space-y-3">
                                {hints.map((hint) => {
                                    const isExpanded = expandedHints[hint.number];
                                    const hasText = !!hint.text;
                                    const toggleExpand = () => {
                                        if (hasText) {
                                            setExpandedHints(prev => ({ ...prev, [hint.number]: !prev[hint.number] }));
                                        }
                                    };

                                    return (
                                        <div
                                            key={hint.number}
                                            className={`rounded-lg border transition-all ${
                                                hint.unlocked
                                                    ? 'border-purple-500/30 bg-purple-500/5'
                                                    : 'border-white/5 bg-white/[0.02]'
                                            }`}
                                        >
                                            <div
                                                className={`p-3 ${hasText ? 'cursor-pointer select-none' : ''}`}
                                                onClick={hasText ? toggleExpand : undefined}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-semibold ${
                                                        hint.unlocked ? 'text-purple-300' : 'text-gray-500'
                                                    }`}>
                                                        Hint {hint.number}
                                                    </span>
                                                    {hasText ? (
                                                        <span className="text-[10px] text-gray-500 transition-transform duration-200" style={{ display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                            ▼
                                                        </span>
                                                    ) : !hint.unlocked ? (
                                                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
                                                            </svg>
                                                            Locked
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {/* Reveal button for unlocked but not yet generated */}
                                                {!hasText && hint.unlocked && (
                                                    <div className="mt-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleGenerateHint(hint.number); }}
                                                            disabled={loadingHint === hint.number}
                                                            className="w-full py-2 px-3 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {loadingHint === hint.number ? (
                                                                <>
                                                                    <div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin"></div>
                                                                    Generating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>✦</span> Reveal Hint
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                                {/* Locked message */}
                                                {!hint.unlocked && (
                                                    <div className="text-xs text-gray-600 mt-2">
                                                        {attemptsUntilNextHint > 0 && hint.number === hintsUnlocked + 1 ? (
                                                            <span>{attemptsUntilNextHint} more {hintMode === 'optimizing' ? 'submission' : 'failed attempt'}{attemptsUntilNextHint !== 1 ? 's' : ''} to unlock</span>
                                                        ) : (
                                                            <span>Keep trying to unlock</span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Collapsible hint text */}
                                                {hasText && isExpanded && (
                                                    <p className="text-sm text-gray-300 leading-relaxed mt-2">{hint.text}</p>
                                                )}
                                            </div>
                                            {/* Progress bar for next unlock */}
                                            {!hint.unlocked && hint.number === hintsUnlocked + 1 && (
                                                <div className="px-3 pb-3">
                                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.max(0, ((hint.number * 2 - attemptsUntilNextHint) / (hint.number * 2)) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                                </>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/5"></div>

                        {/* Complexity Analysis Section */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span>📊</span> Complexity Analysis
                            </h4>
                            
                            {analyzingComplexity ? (
                                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 flex flex-col items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                                    <span className="text-xs text-gray-500">Analyzing complexity...</span>
                                </div>
                            ) : complexity ? (
                                <div className="space-y-3">
                                    {/* Bonus Test Case - Optimal Complexity */}
                                    <div className={`rounded-lg border p-3 ${
                                        complexity.isOptimal
                                            ? 'border-green-500/30 bg-green-500/5'
                                            : 'border-amber-500/30 bg-amber-500/5'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={complexity.isOptimal ? 'text-green-400' : 'text-amber-400'}>
                                                {complexity.isOptimal ? '✓' : '✗'}
                                            </span>
                                            <span className="text-xs font-semibold text-white">Bonus: Optimal Complexity</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 space-y-1">
                                            <div>Your solution: <span className="font-mono text-gray-300">{complexity.timeComplexity}</span> time, <span className="font-mono text-gray-300">{complexity.spaceComplexity}</span> space</div>
                                            <div>Optimal: <span className="font-mono text-gray-300">{complexity.optimalTimeComplexity || '—'}</span> time, <span className="font-mono text-gray-300">{complexity.optimalSpaceComplexity || '—'}</span> space</div>
                                        </div>
                                    </div>

                                    {/* Complexity Badges */}
                                    <div className="flex gap-2">
                                        <div className="flex-1 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                                            <div className="text-[10px] text-blue-400/70 uppercase tracking-wide mb-1">Time</div>
                                            <div className="font-mono text-sm font-bold text-blue-300">{complexity.timeComplexity}</div>
                                        </div>
                                        <div className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                                            <div className="text-[10px] text-emerald-400/70 uppercase tracking-wide mb-1">Space</div>
                                            <div className="font-mono text-sm font-bold text-emerald-300">{complexity.spaceComplexity}</div>
                                        </div>
                                    </div>

                                    {/* Explanation */}
                                    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Analysis</div>
                                        <p className="text-xs text-gray-300 leading-relaxed">{complexity.explanation}</p>
                                    </div>

                                </div>
                            ) : (
                                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
                                    <div className="text-gray-600 mb-2">
                                        <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
                                        </svg>
                                    </div>
                                    <p className="text-xs text-gray-500">Pass all tests to unlock complexity analysis & bonus challenge</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Help Request Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => !helpSending && setShowHelpModal(false)}>
                    <div 
                        className="surface-card rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {helpSent ? (
                            <div className="text-center py-4">
                                <div className="text-5xl mb-3">✅</div>
                                <h3 className="text-lg font-semibold text-white mb-1">Help request sent!</h3>
                                <p className="text-sm text-gray-400">Your professor will be notified.</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                    🆘 Request Help
                                </h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    Send a help request to your professor for this exercise.
                                </p>
                                <textarea
                                    value={helpMessage}
                                    onChange={(e) => setHelpMessage(e.target.value)}
                                    placeholder="Describe what you're struggling with (optional)..."
                                    className="w-full h-24 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 resize-none border border-white/10 focus:outline-none focus:border-[#a1609d]/50"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                />
                                <div className="flex items-center justify-end gap-3 mt-4">
                                    <button
                                        onClick={() => setShowHelpModal(false)}
                                        className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRequestHelp}
                                        disabled={helpSending}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all border-none cursor-pointer"
                                        style={{ background: 'linear-gradient(135deg, #a1609d, #e74c3c)' }}
                                    >
                                        {helpSending ? 'Sending...' : 'Send Request'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Timer Start Modal — shown before timed exercise begins */}
            {showTimerStartModal && exercise?.time_limit_minutes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div 
                        className="surface-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-white/10 text-center"
                    >
                        <div className="text-6xl mb-4">⏱</div>
                        <h3 className="text-xl font-bold text-white mb-2">Timed Exercise</h3>
                        <p className="text-gray-400 mb-2">
                            This exercise has a time limit of <span className="text-white font-semibold">{exercise.time_limit_minutes} minute{exercise.time_limit_minutes !== 1 ? 's' : ''}</span>.
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            Once you start the timer, you cannot pause or restart it. The countdown begins immediately and you won't be able to submit after the time expires.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-5 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors border border-white/10 bg-transparent cursor-pointer"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={handleStartTimer}
                                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all border-none cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                            >
                                ▶ Start Timer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Timer Expired Overlay */}
            {timerExpired && exercise?.time_limit_minutes && (
                <div className="fixed bottom-6 right-6 z-40 surface-card rounded-xl p-4 shadow-2xl border border-red-500/30 bg-red-500/10 max-w-xs">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">⏰</span>
                        <div>
                            <h4 className="font-semibold text-red-400 text-sm">Time Expired</h4>
                            <p className="text-xs text-gray-400">Submissions are no longer accepted for this exercise.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Exercise;
