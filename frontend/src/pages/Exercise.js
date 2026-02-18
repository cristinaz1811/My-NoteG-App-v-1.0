import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { exerciseService } from '../services/api';

const Exercise = () => {
    const { id } = useParams();
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
            setCode(response.data.starter_code || '');
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

    if (loading) {
        return <div className="loading">Loading exercise...</div>;
    }

    if (!exercise) {
        return <div className="container">Exercise not found</div>;
    }

    return (
        <div className="exercise-container">
            <div className="exercise-description">
                <h2>{exercise.title}</h2>
                <span className={`difficulty ${exercise.difficulty}`}>
                    {exercise.difficulty}
                </span>
                <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                    {exercise.description}
                </p>

                <div className="test-cases">
                    <h3>Example Test Cases:</h3>
                    {exercise.testCases?.map((testCase, index) => (
                        <div key={testCase.id} className="test-case">
                            <strong>Test Case {index + 1}:</strong>
                            <div>Input: {testCase.input}</div>
                            <div>Expected Output: {testCase.expected_output}</div>
                        </div>
                    ))}
                </div>

                {exercise.userProgress && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
                        <h3>Your Progress</h3>
                        <p>Best Score: {exercise.userProgress.best_score}%</p>
                        <p>Attempts: {exercise.userProgress.attempts}</p>
                        <p>Status: {exercise.userProgress.completed ? '✅ Completed' : '⏳ In Progress'}</p>
                    </div>
                )}
            </div>

            <div className="editor-panel">
                <div className="editor-header">
                    <span>Code Editor - {exercise.language}</span>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn btn-primary"
                    >
                        {submitting ? 'Submitting...' : 'Submit Solution'}
                    </button>
                </div>

                <div className="editor-wrapper">
                    <Editor
                        height="100%"
                        language={exercise.language}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        theme="vs-dark"
                        options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                        }}
                    />
                </div>

                {results && (
                    <div className="editor-footer">
                        <div className="results-panel">
                            <h3>
                                Results: {results.testsPassed}/{results.testsTotal} tests passed
                                ({results.score.toFixed(2)}%)
                            </h3>
                            {results.results.map((result, index) => (
                                <div
                                    key={index}
                                    className={`result-item ${result.passed ? 'passed' : 'failed'}`}
                                >
                                    <strong>Test Case {index + 1}: {result.passed ? '✅ Passed' : '❌ Failed'}</strong>
                                    <div>Input: {result.input}</div>
                                    <div>Expected: {result.expected}</div>
                                    <div>Got: {result.actual || result.error}</div>
                                    {result.executionTime && (
                                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                            Time: {result.executionTime}ms
                                        </div>
                                    )}
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
