import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { exerciseService } from '../services/api';
import ExercisePreview from '../components/ExercisePreview';

const EditExercise = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exercise, setExercise] = useState(null);
    const [testCases, setTestCases] = useState([]);
    const [exerciseFiles, setExerciseFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Panel expansion state
    const [expandedPanels, setExpandedPanels] = useState({
        details: false,
        testCases: false,
        files: false,
        hintTester: false
    });

    // New test case form state
    const [newTestCase, setNewTestCase] = useState({
        input: '',
        expected_output: '',
        is_hidden: false,
        weight: 1
    });

    // New file form state
    const [newFile, setNewFile] = useState({
        filename: '',
        starter_code: '',
        is_entry_point: false,
    });

    // AI Hint Tester state
    const [hintTesterCode, setHintTesterCode] = useState('');
    const [hintTesterResults, setHintTesterResults] = useState(null);
    const [generatedHints, setGeneratedHints] = useState({});
    const [loadingHint, setLoadingHint] = useState(null);
    const [hintTesterComplexity, setHintTesterComplexity] = useState(null);

    // File editing state
    const [editingFileId, setEditingFileId] = useState(null);
    const [fileEditData, setFileEditData] = useState({});
    const [selectedFileForCode, setSelectedFileForCode] = useState(null);

    // Left panel edit/preview toggle
    const [leftPanelMode, setLeftPanelMode] = useState('edit'); // 'edit' or 'preview'

    // Resizable panels state
    const [leftPanelWidth, setLeftPanelWidth] = useState(33); // percentage
    const [rightPanelWidth, setRightPanelWidth] = useState(33); // percentage
    const [resizing, setResizing] = useState(null); // 'left' or 'right' or null

    const handleMouseDown = (panel) => {
        setResizing(panel);
    };

    const handleMouseUp = () => {
        setResizing(null);
    };

    const handleMouseMove = (e) => {
        if (!resizing) return;

        const container = document.querySelector('[data-layout-container]');
        if (!container) return;

        const containerWidth = container.clientWidth;
        const mouseX = e.clientX;
        const containerLeft = container.getBoundingClientRect().left;
        const relativeX = mouseX - containerLeft;
        const percentageX = (relativeX / containerWidth) * 100;

        if (resizing === 'left') {
            // Resize left panel (min 20%, max 60%)
            const newLeftWidth = Math.min(Math.max(percentageX, 20), 60);
            setLeftPanelWidth(newLeftWidth);
        } else if (resizing === 'right') {
            // Resize right panel (min 20%, max 60%)
            const newRightWidth = Math.min(Math.max(100 - percentageX, 20), 60);
            setRightPanelWidth(newRightWidth);
        }
    };

    // Form data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'easy',
        language: 'javascript',
        starter_code: '',
        requires_efficiency: false,
        time_limit_minutes: '',
        is_multi_file: false,
        ai_hints_enabled: true,
        is_test: false,
        is_published: true,
        available_from: '',
        available_until: '',
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
                time_limit_minutes: exerciseRes.data.time_limit_minutes || '',
                is_multi_file: exerciseRes.data.is_multi_file || false,
                ai_hints_enabled: exerciseRes.data.ai_hints_enabled !== false,
                is_test: exerciseRes.data.is_test || false,
                is_published: exerciseRes.data.is_published !== false,
                available_from: exerciseRes.data.available_from ? exerciseRes.data.available_from.slice(0, 16) : '',
                available_until: exerciseRes.data.available_until ? exerciseRes.data.available_until.slice(0, 16) : '',
            });

            const testCasesRes = await exerciseService.getTestCases(id);
            setTestCases(testCasesRes.data);

            if (exerciseRes.data.is_multi_file) {
                try {
                    const filesRes = await exerciseService.getExerciseFiles(id);
                    setExerciseFiles(filesRes.data);
                    // Auto-select the first file or entry point for multi-file exercises
                    if (filesRes.data.length > 0) {
                        const entryPointFile = filesRes.data.find(f => f.is_entry_point) || filesRes.data[0];
                        setSelectedFileForCode(entryPointFile);
                    }
                } catch (err) {
                    console.error('Error loading exercise files:', err);
                }
            } else {
                // Clear selected file for single-file exercises
                setSelectedFileForCode(null);
            }
        } catch (error) {
            console.error('Error loading exercise:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveFileStarterCode = async (file) => {
        if (!file.id) return; // Skip if file is new and not yet saved
        try {
            await exerciseService.updateExerciseFile(file.id, {
                starter_code: file.starter_code || ''
            });
        } catch (error) {
            console.error('Error saving file starter code:', error);
        }
    };

    const handleUpdateExercise = async () => {
        setSaving(true);
        try {
            // Save all file starter codes first
            if (formData.is_multi_file && exerciseFiles.length > 0) {
                for (const file of exerciseFiles) {
                    await saveFileStarterCode(file);
                }
            }

            const dataToSend = {
                ...formData,
                time_limit_minutes: formData.time_limit_minutes === '' ? null : formData.time_limit_minutes
            };
            await exerciseService.updateExercise(id, dataToSend);
            loadExercise();
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
            const res = await exerciseService.addTestCase(id, newTestCase);
            // Add test case to local state instead of reloading
            setTestCases(prev => [...prev, res.data]);
            setNewTestCase({ input: '', expected_output: '', is_hidden: false, weight: 1 });
        } catch (error) {
            console.error('Error adding test case:', error);
            alert(error.response?.data?.error || 'Failed to add test case');
        }
    };

    const handleUpdateTestCase = async (testCaseId, data) => {
        try {
            await exerciseService.updateTestCase(testCaseId, data);
            // Update local state instead of reloading
            setTestCases(prev =>
                prev.map(tc => tc.id === testCaseId ? { ...tc, ...data } : tc)
            );
        } catch (error) {
            console.error('Error updating test case:', error);
            alert(error.response?.data?.error || 'Failed to update test case');
        }
    };

    const handleDeleteTestCase = async (testCaseId) => {
        if (!window.confirm('Are you sure you want to delete this test case?')) return;
        try {
            await exerciseService.deleteTestCase(testCaseId);
            // Remove from local state instead of reloading
            setTestCases(prev => prev.filter(tc => tc.id !== testCaseId));
        } catch (error) {
            console.error('Error deleting test case:', error);
            alert(error.response?.data?.error || 'Failed to delete test case');
        }
    };

    const handleAddFile = async () => {
        if (!newFile.filename) {
            alert('Filename is required');
            return;
        }
        try {
            const res = await exerciseService.addExerciseFile(id, newFile);
            // Add file to local state instead of reloading
            const newFileWithData = res.data;
            setExerciseFiles(prev => [...prev, newFileWithData]);
            // Auto-select the newly added file for editing
            setSelectedFileForCode(newFileWithData);
            setNewFile({ filename: '', starter_code: '', is_entry_point: false });
        } catch (error) {
            console.error('Error adding file:', error);
            alert(error.response?.data?.error || 'Failed to add file');
        }
    };

    const handleUpdateFile = async (fileId, data) => {
        try {
            await exerciseService.updateExerciseFile(fileId, data);
            // Update local state instead of reloading
            setExerciseFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, ...data } : f)
            );
        } catch (error) {
            console.error('Error updating file:', error);
            alert(error.response?.data?.error || 'Failed to update file');
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;
        try {
            await exerciseService.deleteExerciseFile(fileId);
            // Remove from local state instead of reloading
            setExerciseFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error('Error deleting file:', error);
            alert(error.response?.data?.error || 'Failed to delete file');
        }
    };

    const togglePanel = (panelName) => {
        setExpandedPanels(prev => ({
            ...prev,
            [panelName]: !prev[panelName]
        }));
    };

    const handleGenerateHintForTester = async (hintNumber) => {
        if (!hintTesterCode.trim()) {
            alert('Please write some test code first');
            return;
        }

        setLoadingHint(hintNumber);
        try {
            // For testing, pass test cases so AI understands the exercise context
            const response = await exerciseService.generateAIHint(id, {
                hintNumber,
                code: hintTesterCode,
                testCases: testCases,
                failedTests: [],
                mode: 'solving',
                exerciseDescription: formData.description,
                exerciseTitle: formData.title,
                currentComplexity: hintTesterComplexity ? `${hintTesterComplexity.timeComplexity} time, ${hintTesterComplexity.spaceComplexity} space` : undefined,
                optimalComplexity: undefined,
            });

            setGeneratedHints(prev => ({
                ...prev,
                [hintNumber]: response.data.hint
            }));
        } catch (error) {
            console.error('Error generating hint:', error);
            alert(error.response?.data?.error || 'Failed to generate hint');
        } finally {
            setLoadingHint(null);
        }
    };

    const handleAnalyzeTestCode = async () => {
        if (!hintTesterCode.trim()) {
            alert('Please write some test code first');
            return;
        }

        try {
            const response = await exerciseService.getComplexityAnalysis(id, { code: hintTesterCode });
            setHintTesterComplexity(response.data);
        } catch (error) {
            console.error('Error analyzing code:', error);
        }
    };

    const handleResetHints = async () => {
        try {
            // Delete cached test hints from database so new ones can be generated
            await exerciseService.deleteTestHints(id);
        } catch (error) {
            console.error('Error deleting hints:', error);
        }
        // Clear frontend state
        setGeneratedHints({});
        setHintTesterCode('');
        setHintTesterComplexity(null);
    };

    const startEditingFile = (file) => {
        setEditingFileId(file.id);
        setFileEditData({
            filename: file.filename,
            starter_code: file.starter_code || '',
            is_entry_point: file.is_entry_point || false,
            display_order: file.display_order || 0,
        });
    };

    const saveFileEdit = async () => {
        try {
            await exerciseService.updateExerciseFile(editingFileId, fileEditData);
            setExerciseFiles(prev =>
                prev.map(f => f.id === editingFileId ? { ...f, ...fileEditData } : f)
            );
            setEditingFileId(null);
            setFileEditData({});
        } catch (error) {
            console.error('Error saving file:', error);
            alert(error.response?.data?.error || 'Failed to save file');
        }
    };

    const cancelFileEdit = () => {
        setEditingFileId(null);
        setFileEditData({});
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
        <div className="h-screen flex flex-col bg-gray-950">
            {/* Header */}
            <header className="flex-shrink-0 bg-gray-900 border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/professor/course/${exercise?.course_id}`)}
                        className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <span>←</span> Back
                    </button>
                    <div>
                        <h1 className="text-lg font-bold">{exercise?.title || 'Exercise'}</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Split View Editor</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/professor/course/${exercise?.course_id}`)}
                        className="px-4 py-2 rounded-lg font-medium text-gray-300 border border-white/20 hover:border-white/40 hover:text-white transition-all"
                    >
                        Discard Changes
                    </button>
                    <button
                        onClick={handleUpdateExercise}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50 transition-all"
                        style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </header>

            {/* Three-Column Layout */}
            <div
                className="flex flex-1 overflow-hidden gap-0"
                data-layout-container
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: resizing ? 'col-resize' : 'default' }}
            >
                {/* LEFT: Exercise Preview (Editable/Preview Toggle) */}
                <aside
                    className="overflow-y-auto bg-gray-950 border-r border-white/5 flex flex-col flex-shrink-0"
                    style={{ width: `${leftPanelWidth}%` }}
                >
                    {/* Toggle Header */}
                    <div className="flex-shrink-0 bg-gray-800 px-4 py-3 border-b border-white/5 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-300">
                            {leftPanelMode === 'edit' ? '✏️ Editing' : '👁️ Preview (Student View)'}
                        </p>
                        <button
                            onClick={() => setLeftPanelMode(leftPanelMode === 'edit' ? 'preview' : 'edit')}
                            className="text-xs px-2.5 py-1 rounded border transition-colors"
                            style={{
                                borderColor: leftPanelMode === 'edit' ? '#a1609d' : '#666',
                                color: leftPanelMode === 'edit' ? '#a1609d' : '#888'
                            }}
                        >
                            {leftPanelMode === 'edit' ? 'Preview' : 'Edit'}
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        <ExercisePreview
                            formData={formData}
                            testCases={testCases}
                            isEditable={leftPanelMode === 'edit'}
                            onDescriptionChange={(value) => setFormData({ ...formData, description: value })}
                            onTestCaseAdd={handleAddTestCase}
                            onTestCaseUpdate={handleUpdateTestCase}
                            onTestCaseDelete={handleDeleteTestCase}
                        />
                    </div>
                </aside>

                {/* LEFT-CENTER DIVIDER */}
                <div
                    className="w-1 bg-white/5 hover:bg-white/20 cursor-col-resize transition-colors flex-shrink-0"
                    onMouseDown={() => handleMouseDown('left')}
                />

                {/* CENTER: Code Editor */}
                <main
                    className="flex flex-col bg-gray-900 border-r border-white/5 overflow-hidden flex-shrink-0"
                    style={{ width: `${100 - leftPanelWidth - rightPanelWidth}%` }}
                >
                    <div className="flex-shrink-0 bg-gray-800 px-4 py-3 border-b border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-300">
                                {formData.is_multi_file && selectedFileForCode
                                    ? `Starter Code - ${selectedFileForCode.filename}`
                                    : 'Starter Code'}
                            </p>
                            {formData.is_multi_file && (
                                <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Multi-file</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            {formData.is_multi_file
                                ? 'Edit each file\'s starter code. Click tabs to switch files.'
                                : 'This is what students see when they open the exercise'}
                        </p>
                    </div>

                    {/* File Tabs (Multi-file exercises) */}
                    {formData.is_multi_file && exerciseFiles.length > 0 && (
                        <div className="flex-shrink-0 border-b border-white/5 bg-gray-950 overflow-x-auto">
                            <div className="flex items-center gap-1 px-2 py-2">
                                {exerciseFiles.map((file) => (
                                    <button
                                        key={file.id}
                                        onClick={() => {
                                            // Auto-save current file's code before switching
                                            if (selectedFileForCode && selectedFileForCode.id !== file.id) {
                                                saveFileStarterCode(selectedFileForCode);
                                            }
                                            setSelectedFileForCode(file);
                                        }}
                                        className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-all ${
                                            selectedFileForCode?.id === file.id
                                                ? 'bg-[#a1609d] text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                                        }`}
                                    >
                                        {file.is_entry_point && <span className="text-green-400 mr-1">▶</span>}
                                        {file.filename}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Code Editor */}
                    <div className="flex-1 overflow-hidden">
                        <Editor
                            height="100%"
                            language={formData.language}
                            value={formData.is_multi_file && selectedFileForCode
                                ? selectedFileForCode.starter_code || ''
                                : formData.starter_code}
                            onChange={(value) => {
                                const newValue = value || '';
                                if (formData.is_multi_file && selectedFileForCode) {
                                    // Update the selected file's starter code
                                    setExerciseFiles(prev =>
                                        prev.map(f => f.id === selectedFileForCode.id
                                            ? { ...f, starter_code: newValue }
                                            : f
                                        )
                                    );
                                    // Also update the selectedFileForCode state for immediate UI feedback
                                    setSelectedFileForCode(prev => prev ? { ...prev, starter_code: newValue } : null);
                                } else {
                                    // Update main exercise starter code
                                    setFormData({ ...formData, starter_code: newValue });
                                }
                            }}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                padding: { top: 16, bottom: 16 },
                            }}
                        />
                    </div>
                </main>

                {/* CENTER-RIGHT DIVIDER */}
                <div
                    className="w-1 bg-white/5 hover:bg-white/20 cursor-col-resize transition-colors flex-shrink-0"
                    onMouseDown={() => handleMouseDown('right')}
                />

                {/* RIGHT: Collapsible Settings & Test Cases */}
                <aside
                    className="overflow-y-auto bg-gray-950 border-l border-white/5 flex flex-col flex-shrink-0"
                    style={{ width: `${rightPanelWidth}%` }}
                >
                    <div className="p-6 space-y-4">
                        {/* Details Panel */}
                        <CollapsiblePanel
                            title="Exercise Details"
                            isExpanded={expandedPanels.details}
                            onToggle={() => togglePanel('details')}
                        >
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded text-gray-100 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded text-gray-100 text-sm resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                                        <select
                                            value={formData.difficulty}
                                            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded text-gray-100 text-sm"
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
                                            className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded text-gray-100 text-sm"
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="python">Python</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                            <option value="csharp">C#</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_multi_file"
                                        checked={formData.is_multi_file}
                                        onChange={(e) => setFormData({ ...formData, is_multi_file: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="is_multi_file" className="text-sm text-gray-300">Multi-File Exercise</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="requires_efficiency"
                                        checked={formData.requires_efficiency}
                                        onChange={(e) => setFormData({ ...formData, requires_efficiency: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="requires_efficiency" className="text-sm text-gray-300">Require Efficient Solution</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Time Limit (minutes)</label>
                                    <input
                                        type="number"
                                        value={formData.time_limit_minutes}
                                        onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
                                        min="1"
                                        max="300"
                                        placeholder="Leave empty for no limit"
                                        className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded text-gray-100 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="ai_hints_enabled"
                                        checked={formData.ai_hints_enabled}
                                        onChange={(e) => setFormData({ ...formData, ai_hints_enabled: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="ai_hints_enabled" className="text-sm text-gray-300">Enable AI Hints</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_test"
                                        checked={formData.is_test}
                                        onChange={(e) => setFormData({ ...formData, is_test: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="is_test" className="text-sm text-gray-300">Mark as Test</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_published"
                                        checked={formData.is_published}
                                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="is_published" className="text-sm text-gray-300">Published</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Available From</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.available_from}
                                        onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded text-gray-100 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Available Until</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.available_until}
                                        onChange={(e) => setFormData({ ...formData, available_until: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded text-gray-100 text-sm"
                                    />
                                </div>
                            </div>
                        </CollapsiblePanel>

                        {/* Files Panel */}
                        {formData.is_multi_file && (
                            <CollapsiblePanel
                                title={`Files (${exerciseFiles.length})`}
                                isExpanded={expandedPanels.files}
                                onToggle={() => togglePanel('files')}
                            >
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Filename</label>
                                        <input
                                            type="text"
                                            value={newFile.filename}
                                            onChange={(e) => setNewFile({ ...newFile, filename: e.target.value })}
                                            className="w-full px-2 py-1.5 bg-gray-800 border border-white/10 rounded text-gray-100 text-xs"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newFile.is_entry_point}
                                            onChange={(e) => setNewFile({ ...newFile, is_entry_point: e.target.checked })}
                                            className="w-3 h-3"
                                        />
                                        <span className="text-xs">Entry Point</span>
                                    </label>
                                    <button
                                        onClick={handleAddFile}
                                        className="w-full px-3 py-1.5 rounded text-xs font-medium text-white"
                                        style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
                                    >
                                        + Add File
                                    </button>
                                    {exerciseFiles.map((file) => (
                                        <div key={file.id} className="bg-gray-800/50 rounded border border-white/5">
                                            {editingFileId === file.id ? (
                                                // Editing mode
                                                <div className="p-3 space-y-2 text-xs">
                                                    <p className="text-xs text-gray-400 mb-3">Edit the starter code in the center column ➜</p>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-400 mb-1">Filename</label>
                                                        <input
                                                            type="text"
                                                            value={fileEditData.filename}
                                                            onChange={(e) => setFileEditData({ ...fileEditData, filename: e.target.value })}
                                                            className="w-full px-2 py-1 bg-gray-700 border border-white/10 rounded text-gray-100 text-xs"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-400 mb-1">Order</label>
                                                            <input
                                                                type="number"
                                                                value={fileEditData.display_order}
                                                                onChange={(e) => setFileEditData({ ...fileEditData, display_order: parseInt(e.target.value) || 0 })}
                                                                className="w-full px-2 py-1 bg-gray-700 border border-white/10 rounded text-gray-100 text-xs"
                                                            />
                                                        </div>
                                                        <label className="flex items-center gap-2 cursor-pointer pt-5">
                                                            <input
                                                                type="checkbox"
                                                                checked={fileEditData.is_entry_point}
                                                                onChange={(e) => setFileEditData({ ...fileEditData, is_entry_point: e.target.checked })}
                                                                className="w-3 h-3"
                                                            />
                                                            <span className="text-xs">Entry Point</span>
                                                        </label>
                                                    </div>
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            onClick={saveFileEdit}
                                                            className="flex-1 px-2 py-1 rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                                                        >
                                                            ✓ Save
                                                        </button>
                                                        <button
                                                            onClick={cancelFileEdit}
                                                            className="flex-1 px-2 py-1 rounded text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View mode
                                                <div className="p-3 space-y-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="text-gray-300 font-mono font-medium">{file.filename}</div>
                                                            {file.is_entry_point && (
                                                                <span className="inline-block text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded mt-1">▶ Entry Point</span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => startEditingFile(file)}
                                                                className="text-blue-400 hover:text-blue-300 text-xs"
                                                            >
                                                                ✎ Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteFile(file.id)}
                                                                className="text-red-400 hover:text-red-300 text-xs"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {file.starter_code && (
                                                        <div className="text-xs bg-black/30 p-1.5 rounded border border-white/5 max-h-20 overflow-y-auto">
                                                            <pre className="font-mono text-gray-400 text-[10px] whitespace-pre-wrap break-words">
                                                                {file.starter_code.substring(0, 200)}{file.starter_code.length > 200 ? '...' : ''}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-500">Order: {file.display_order}</div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CollapsiblePanel>
                        )}

                        {/* AI Hint Tester Panel */}
                        {formData.ai_hints_enabled && (
                            <CollapsiblePanel
                                title="Test AI Hints"
                                isExpanded={expandedPanels.hintTester}
                                onToggle={() => togglePanel('hintTester')}
                            >
                                <div className="space-y-3 text-sm">
                                    <p className="text-xs text-gray-400">Write test code below to verify AI hints work correctly</p>

                                    <div className="h-40 overflow-hidden border border-white/10 rounded">
                                        <Editor
                                            height="100%"
                                            language={formData.language}
                                            value={hintTesterCode}
                                            onChange={(value) => setHintTesterCode(value || '')}
                                            theme="vs-dark"
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 11,
                                                lineNumbers: 'on',
                                                scrollBeyondLastLine: false,
                                                padding: { top: 8, bottom: 8 },
                                            }}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAnalyzeTestCode}
                                            className="flex-1 px-3 py-1.5 rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                        >
                                            Analyze Code
                                        </button>
                                        {(Object.keys(generatedHints).length > 0 || hintTesterCode.trim()) && (
                                            <button
                                                onClick={handleResetHints}
                                                className="flex-1 px-3 py-1.5 rounded text-xs font-medium text-white bg-gray-700 hover:bg-gray-600 transition-colors"
                                            >
                                                 Reset
                                            </button>
                                        )}
                                    </div>

                                    {hintTesterComplexity && (
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs">
                                            <div className="text-blue-300 font-medium mb-1">Complexity:</div>
                                            <div className="text-blue-200">
                                                Time: <span className="font-mono">{hintTesterComplexity.timeComplexity}</span>
                                            </div>
                                            <div className="text-blue-200">
                                                Space: <span className="font-mono">{hintTesterComplexity.spaceComplexity}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {[1, 2, 3].map((hintNum) => (
                                            <div key={hintNum}>
                                                <button
                                                    onClick={() => handleGenerateHintForTester(hintNum)}
                                                    disabled={loadingHint === hintNum}
                                                    className="w-full px-3 py-1.5 rounded text-xs font-medium text-white transition-all flex items-center justify-center gap-2"
                                                    style={{
                                                        background: generatedHints[hintNum]
                                                            ? 'linear-gradient(135deg, #10b981, #059669)'
                                                            : 'linear-gradient(135deg, #a1609d, #b870ad)'
                                                    }}
                                                >
                                                    {loadingHint === hintNum ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            Generating...
                                                        </>
                                                    ) : generatedHints[hintNum] ? (
                                                        <>✓ Hint {hintNum} Ready</>
                                                    ) : (
                                                        <>✦ Generate Hint {hintNum}</>
                                                    )}
                                                </button>
                                                {generatedHints[hintNum] && (
                                                    <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2.5 mt-1 text-xs leading-relaxed text-gray-300">
                                                        <div className="text-purple-300 font-medium mb-1.5">Hint {hintNum}:</div>
                                                        <p className="whitespace-pre-wrap">{generatedHints[hintNum]}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-xs text-gray-500 italic">
                                        💡 These hints are for testing only and won't be saved. Tips: Write code with bugs to get specific hints, or use correct code to verify hints are appropriate.
                                    </p>
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

// Collapsible Panel Component
const CollapsiblePanel = ({ title, isExpanded, onToggle, children }) => {
    return (
        <div className="rounded-lg border border-white/10 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 bg-gray-800/50 hover:bg-gray-800 transition-colors flex items-center justify-between"
            >
                <span className="text-sm font-medium text-gray-200">{title}</span>
                <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            {isExpanded && (
                <div className="p-4 border-t border-white/5 bg-gray-950/50">
                    {children}
                </div>
            )}
        </div>
    );
};

export default EditExercise;
