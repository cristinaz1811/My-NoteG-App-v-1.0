import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { exerciseService } from '../services/api';

const Exercise = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exercise, setExercise] = useState(null);
    const [code, setCode] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadExercise();
    }, [id]);

    const loadExercise = async () => {
        try {
            const response = await exerciseService.getExerciseById(id);
            setExercise(response.data);
            // Replace literal \n strings with actual newlines
            const starterCode = response.data.starter_code || '';
            setCode(starterCode.replace(/\\n/g, '\n'));
        } catch (error) {
            console.error('Error loading exercise:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setResults(null);

        try {
            const response = await exerciseService.submitSolution(id, {
                code,
                language: exercise.language,
            });
            setResults(response.data);
        } catch (error) {
            console.error('Error submitting solution:', error);
            alert('Failed to submit solution');
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
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Left Panel - Description */}
            <div className="lg:w-1/2 xl:w-2/5 p-6 overflow-y-auto bg-[#0a0a0f] border-r border-white/5" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                >
                    <span>←</span> Back
                </button>

                {/* Exercise Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`badge ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                            {exercise.difficulty}
                        </span>
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                            {exercise.language}
                        </span>
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
                {exercise.userProgress && (
                    <div className="surface-card rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Your Progress</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold gradient-text">{exercise.userProgress.best_score}%</div>
                                <div className="text-xs text-gray-500">Best Score</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold gradient-text">{exercise.userProgress.attempts}</div>
                                <div className="text-xs text-gray-500">Attempts</div>
                            </div>
                            <div>
                                <div className={`text-2xl ${exercise.userProgress.completed ? 'text-green-400' : 'text-gray-500'}`}>
                                    {exercise.userProgress.completed ? '✓' : '○'}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {exercise.userProgress.completed ? 'Completed' : 'In Progress'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel - Editor */}
            <div className="lg:w-1/2 xl:w-3/5 flex flex-col bg-[#1e242e]" style={{ height: 'calc(100vh - 4rem)' }}>
                {/* Editor Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#232a36]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
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
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                            submitting 
                                ? 'bg-gray-600 cursor-not-allowed' 
                                : 'gradient-bg hover:opacity-90'
                        }`}
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Running...
                            </span>
                        ) : (
                            '▶ Run Code'
                        )}
                    </button>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1">
                    <Editor
                        height="100%"
                        language={exercise.language}
                        value={code}
                        onChange={(value) => setCode(value || '')}
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
                    <div className="border-t border-white/5 bg-[#0a0a0f] max-h-80 overflow-y-auto">
                        {/* Results Header */}
                        <div className={`px-4 py-3 border-b border-white/5 ${
                            results.score === 100 ? 'bg-green-500/10' : 'bg-amber-500/10'
                        }`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    {results.score === 100 ? (
                                        <>
                                            <span className="text-green-400">✓</span>
                                            <span className="text-green-400">All Tests Passed!</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-amber-400">⚠</span>
                                            <span className="text-amber-400">{results.testsPassed}/{results.testsTotal} Tests Passed</span>
                                        </>
                                    )}
                                </h3>
                                <span className={`text-lg font-bold ${
                                    results.score === 100 ? 'text-green-400' : 'text-amber-400'
                                }`}>
                                    {results.score.toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        {/* Test Results */}
                        <div className="p-4 space-y-3">
                            {results.results.map((result, index) => (
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
                                                {result.actual || result.error}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Exercise;
