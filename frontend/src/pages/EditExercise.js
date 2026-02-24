import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { exerciseService, courseService } from '../services/api';

const EditExercise = () => {
    const { id } = useParams();
    const [exercise, setExercise] = useState(null);
    const [testCases, setTestCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');
    const [saving, setSaving] = useState(false);
    
    // Form data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'easy',
        language: 'javascript',
        starter_code: '',
        requires_efficiency: false,
        time_limit_minutes: ''
    });

    // New test case
    const [newTestCase, setNewTestCase] = useState({
        input: '',
        expected_output: '',
        is_hidden: false,
        weight: 1
    });

    useEffect(() => {
        loadExercise();
    }, [id]);

    const loadExercise = async () => {
        try {
            const exerciseRes = await exerciseService.getExerciseById(id);
            setExercise(exerciseRes.data);
            setFormData({
                title: exerciseRes.data.title,
                description: exerciseRes.data.description,
                difficulty: exerciseRes.data.difficulty,
                language: exerciseRes.data.language,
                starter_code: exerciseRes.data.starter_code || '',
                requires_efficiency: exerciseRes.data.requires_efficiency || false,
                time_limit_minutes: exerciseRes.data.time_limit_minutes || ''
            });

            // Load test cases
            const testCasesRes = await exerciseService.getTestCases(id);
            setTestCases(testCasesRes.data);
        } catch (error) {
            console.error('Error loading exercise:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateExercise = async () => {
        setSaving(true);
        try {
            const dataToSend = {
                ...formData,
                time_limit_minutes: formData.time_limit_minutes === '' ? null : formData.time_limit_minutes
            };
            await exerciseService.updateExercise(id, dataToSend);
            alert('Exercise updated successfully!');
        } catch (error) {
            console.error('Error updating exercise:', error);
            alert(error.response?.data?.error || 'Failed to update exercise');
        } finally {
            setSaving(false);
        }
    };

    const handleAddTestCase = async () => {
        if (!newTestCase.input || !newTestCase.expected_output) {
            alert('Input and expected output are required');
            return;
        }
        try {
            await exerciseService.addTestCase(id, newTestCase);
            setNewTestCase({ input: '', expected_output: '', is_hidden: false, weight: 1 });
            loadExercise();
        } catch (error) {
            console.error('Error adding test case:', error);
            alert(error.response?.data?.error || 'Failed to add test case');
        }
    };

    const handleUpdateTestCase = async (testCaseId, data) => {
        try {
            await exerciseService.updateTestCase(testCaseId, data);
            loadExercise();
        } catch (error) {
            console.error('Error updating test case:', error);
            alert(error.response?.data?.error || 'Failed to update test case');
        }
    };

    const handleDeleteTestCase = async (testCaseId) => {
        if (!window.confirm('Are you sure you want to delete this test case?')) return;
        try {
            await exerciseService.deleteTestCase(testCaseId);
            loadExercise();
        } catch (error) {
            console.error('Error deleting test case:', error);
            alert(error.response?.data?.error || 'Failed to delete test case');
        }
    };

    const getDifficultyBadgeClass = (difficulty) => {
        switch(difficulty) {
            case 'easy': return 'badge-beginner';
            case 'medium': return 'badge-intermediate';
            case 'hard': return 'badge-advanced';
            default: return 'badge-beginner';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-8 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Back Button */}
                <button 
                    onClick={() => window.history.back()}
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                >
                    <span>←</span> Back to Course
                </button>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">{exercise.title}</h1>
                        <div className="flex items-center gap-2">
                            <span className={`badge ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                                {exercise.difficulty}
                            </span>
                            <span className="text-sm text-gray-400">{exercise.language}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-white/10">
                    {['details', 'code', 'test-cases'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px capitalize ${
                                activeTab === tab 
                                    ? 'border-[#a1609d] text-[#a1609d]' 
                                    : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                {/* Details Tab */}
                {activeTab === 'details' && (
                    <div className="surface-card rounded-2xl p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full"
                            />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                    className="w-full"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                                <select
                                    value={formData.language}
                                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                    className="w-full"
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                    <option value="csharp">C#</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                            <input
                                type="checkbox"
                                id="edit_requires_efficiency"
                                checked={formData.requires_efficiency}
                                onChange={(e) => setFormData({ ...formData, requires_efficiency: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 accent-[#a1609d]"
                            />
                            <div>
                                <label htmlFor="edit_requires_efficiency" className="text-sm font-medium text-gray-300 cursor-pointer">Require Efficient Solution</label>
                                <p className="text-xs text-gray-500">Students must achieve optimal time complexity for full marks (80% for correct but inefficient)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-gray-300 mb-1 block">⏱ Time Limit (Quiz Mode)</label>
                                <p className="text-xs text-gray-500 mb-2">Set a countdown timer for exam-like conditions. Leave empty for no time limit.</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={formData.time_limit_minutes}
                                        onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
                                        min="1"
                                        max="300"
                                        placeholder="e.g. 30"
                                        className="w-24 text-center"
                                    />
                                    <span className="text-sm text-gray-400">minutes</span>
                                    {formData.time_limit_minutes && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, time_limit_minutes: '' })}
                                            className="text-xs text-red-400 hover:text-red-300 ml-2"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleUpdateExercise}
                            disabled={saving}
                            className="px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}

                {/* Code Tab */}
                {activeTab === 'code' && (
                    <div className="surface-card rounded-2xl p-6 space-y-4">
                        <h3 className="font-semibold">Starter Code</h3>
                        <p className="text-sm text-gray-400">This is the code students will see when they start the exercise.</p>
                        <div className="rounded-lg overflow-hidden border border-white/10">
                            <Editor
                                height="400px"
                                language={formData.language}
                                value={formData.starter_code}
                                onChange={(value) => setFormData({ ...formData, starter_code: value || '' })}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                }}
                            />
                        </div>
                        <button
                            onClick={handleUpdateExercise}
                            disabled={saving}
                            className="px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                        >
                            {saving ? 'Saving...' : 'Save Starter Code'}
                        </button>
                    </div>
                )}

                {/* Test Cases Tab */}
                {activeTab === 'test-cases' && (
                    <div className="space-y-6">
                        {/* Add Test Case */}
                        <div className="surface-card rounded-2xl p-6">
                            <h3 className="font-semibold mb-4">Add Test Case</h3>
                            <div className="grid sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Input</label>
                                    <textarea
                                        value={newTestCase.input}
                                        onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                                        rows={3}
                                        className="w-full font-mono text-sm"
                                        placeholder="e.g., [1, 2, 3]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Expected Output</label>
                                    <textarea
                                        value={newTestCase.expected_output}
                                        onChange={(e) => setNewTestCase({ ...newTestCase, expected_output: e.target.value })}
                                        rows={3}
                                        className="w-full font-mono text-sm"
                                        placeholder="e.g., 6"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-6 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newTestCase.is_hidden}
                                        onChange={(e) => setNewTestCase({ ...newTestCase, is_hidden: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm text-gray-300">Hidden (not visible to students)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300">Weight:</label>
                                    <input
                                        type="number"
                                        value={newTestCase.weight}
                                        onChange={(e) => setNewTestCase({ ...newTestCase, weight: parseInt(e.target.value) || 1 })}
                                        min="1"
                                        className="w-16 text-center"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddTestCase}
                                className="px-4 py-2 rounded-lg font-medium text-white"
                                style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                            >
                                Add Test Case
                            </button>
                        </div>

                        {/* Existing Test Cases */}
                        <div>
                            <h3 className="font-semibold mb-4">
                                Test Cases ({testCases.length})
                            </h3>
                            {testCases.length === 0 ? (
                                <div className="surface-card rounded-2xl p-8 text-center">
                                    <p className="text-gray-400">No test cases yet. Add your first test case above!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {testCases.map((tc, index) => (
                                        <TestCaseCard
                                            key={tc.id}
                                            testCase={tc}
                                            index={index}
                                            onUpdate={(data) => handleUpdateTestCase(tc.id, data)}
                                            onDelete={() => handleDeleteTestCase(tc.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Test Case Card Component
const TestCaseCard = ({ testCase, index, onUpdate, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        input: testCase.input,
        expected_output: testCase.expected_output,
        is_hidden: testCase.is_hidden,
        weight: testCase.weight
    });

    const handleSave = () => {
        onUpdate(formData);
        setEditing(false);
    };

    return (
        <div className="surface-card rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">Test Case #{index + 1}</span>
                    {testCase.is_hidden && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-400/20 text-red-400">Hidden</span>
                    )}
                    <span className="text-xs text-gray-500">Weight: {testCase.weight}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEditing(!editing)}
                        className="text-sm text-[#fef483] hover:text-[#fff9c4]"
                    >
                        {editing ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-sm text-red-400 hover:text-red-300"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {editing ? (
                <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Input</label>
                            <textarea
                                value={formData.input}
                                onChange={(e) => setFormData({ ...formData, input: e.target.value })}
                                rows={2}
                                className="w-full font-mono text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Expected Output</label>
                            <textarea
                                value={formData.expected_output}
                                onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
                                rows={2}
                                className="w-full font-mono text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.is_hidden}
                                onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                            />
                            <span className="text-sm">Hidden</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Weight:</span>
                            <input
                                type="number"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
                                min="1"
                                className="w-16 text-center text-sm"
                            />
                        </div>
                        <button
                            onClick={handleSave}
                            className="ml-auto px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <span className="block text-xs text-gray-400 mb-1">Input</span>
                        <code className="block text-sm bg-black/30 p-2 rounded font-mono whitespace-pre-wrap">
                            {testCase.input}
                        </code>
                    </div>
                    <div>
                        <span className="block text-xs text-gray-400 mb-1">Expected Output</span>
                        <code className="block text-sm bg-black/30 p-2 rounded font-mono whitespace-pre-wrap">
                            {testCase.expected_output}
                        </code>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditExercise;
