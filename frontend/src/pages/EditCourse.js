import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService, exerciseService, lectureService } from '../services/api';

const EditCourse = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');
    const [editingDetails, setEditingDetails] = useState(false);
    const [formData, setFormData] = useState({});
    
    // Modal states
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [showExerciseModal, setShowExerciseModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingChapter, setEditingChapter] = useState(null);
    const [editingExercise, setEditingExercise] = useState(null);
    const [tagInput, setTagInput] = useState('');
    const [objectiveInput, setObjectiveInput] = useState('');
    const [lectures, setLectures] = useState([]);

    useEffect(() => {
        loadCourse();
        loadLectures();
    }, [id]);

    const loadLectures = async () => {
        try {
            const res = await lectureService.getLecturesByCourse(id);
            setLectures(res.data);
        } catch {}
    };

    const handleDeleteLecture = async (lectureId) => {
        if (!window.confirm('Delete this lecture and all its pages?')) return;
        try {
            await lectureService.deleteLecture(lectureId);
            setLectures(prev => prev.filter(l => l.id !== lectureId));
        } catch {
            alert('Failed to delete lecture.');
        }
    };

    const loadCourse = async () => {
        try {
            const response = await courseService.getCourseById(id);
            setCourse(response.data);
            setFormData({
                title: response.data.title,
                description: response.data.description,
                difficulty: response.data.difficulty,
                long_description: response.data.long_description || '',
                estimated_hours: response.data.estimated_hours || 1,
                tags: response.data.tags || [],
                learning_objectives: response.data.learning_objectives || [],
                is_private: response.data.is_private || false,
            });
        } catch (error) {
            console.error('Error loading course:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCourse = async () => {
        try {
            await courseService.updateCourse(id, formData);
            setEditingDetails(false);
            loadCourse();
        } catch (error) {
            console.error('Error updating course:', error);
            alert(error.response?.data?.error || 'Failed to update course');
        }
    };

    const handleAddChapter = async (chapterData) => {
        try {
            await courseService.addChapter(id, chapterData);
            setShowChapterModal(false);
            loadCourse();
        } catch (error) {
            console.error('Error adding chapter:', error);
            alert(error.response?.data?.error || 'Failed to add chapter');
        }
    };

    const handleUpdateChapter = async (chapterId, chapterData) => {
        try {
            await courseService.updateChapter(chapterId, chapterData);
            setEditingChapter(null);
            loadCourse();
        } catch (error) {
            console.error('Error updating chapter:', error);
            alert(error.response?.data?.error || 'Failed to update chapter');
        }
    };

    const handleDeleteChapter = async (chapterId) => {
        if (!window.confirm('Are you sure? This will delete all exercises in this chapter.')) return;
        try {
            await courseService.deleteChapter(chapterId);
            loadCourse();
        } catch (error) {
            console.error('Error deleting chapter:', error);
            alert(error.response?.data?.error || 'Failed to delete chapter');
        }
    };

    const handleAddExercise = async (exerciseData) => {
        try {
            await exerciseService.createProfessorExercise({ ...exerciseData, courseId: id });
            setShowExerciseModal(false);
            loadCourse();
        } catch (error) {
            console.error('Error adding exercise:', error);
            alert(error.response?.data?.error || 'Failed to add exercise');
        }
    };

    const handleBulkImport = async (exercises) => {
        try {
            const response = await exerciseService.bulkImport(id, exercises);
            setShowBulkImportModal(false);
            loadCourse();
            const { created, errors: importErrors } = response.data;
            let msg = `Successfully imported ${created.length} exercise(s).`;
            if (importErrors && importErrors.length > 0) {
                msg += `\n\n${importErrors.length} exercise(s) failed:\n` + importErrors.map(e => `• ${e.title}: ${e.error}`).join('\n');
            }
            alert(msg);
        } catch (error) {
            console.error('Error bulk importing:', error);
            alert(error.response?.data?.error || 'Failed to import exercises');
        }
    };

    const handleBulkExport = async (format) => {
        try {
            const response = await exerciseService.bulkExport(id);
            const data = response.data;

            let content, filename, mimeType;

            if (format === 'json') {
                content = JSON.stringify(data, null, 2);
                filename = `${(data.courseTitle || 'exercises').replace(/[^a-z0-9]/gi, '_')}_exercises.json`;
                mimeType = 'application/json';
            } else {
                // CSV export
                const exercises = data.exercises || [];
                if (exercises.length === 0) {
                    alert('No exercises to export.');
                    return;
                }
                const csvRows = [];
                csvRows.push('title,description,difficulty,language,starterCode,chapter,requires_efficiency,time_limit_minutes,testCases');
                for (const ex of exercises) {
                    const escapeCsv = (val) => {
                        if (val === null || val === undefined) return '';
                        const str = String(val);
                        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                            return '"' + str.replace(/"/g, '""') + '"';
                        }
                        return str;
                    };
                    csvRows.push([
                        escapeCsv(ex.title),
                        escapeCsv(ex.description),
                        escapeCsv(ex.difficulty),
                        escapeCsv(ex.language),
                        escapeCsv(ex.starterCode),
                        escapeCsv(ex.chapter),
                        escapeCsv(ex.requires_efficiency),
                        escapeCsv(ex.time_limit_minutes),
                        escapeCsv(JSON.stringify(ex.testCases)),
                    ].join(','));
                }
                content = csvRows.join('\n');
                filename = `${(data.courseTitle || 'exercises').replace(/[^a-z0-9]/gi, '_')}_exercises.csv`;
                mimeType = 'text/csv';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting:', error);
            alert(error.response?.data?.error || 'Failed to export exercises');
        }
    };

    const handleDeleteExercise = async (exerciseId) => {
        if (!window.confirm('Are you sure you want to delete this exercise?')) return;
        try {
            await exerciseService.deleteExercise(exerciseId);
            loadCourse();
        } catch (error) {
            console.error('Error deleting exercise:', error);
            alert(error.response?.data?.error || 'Failed to delete exercise');
        }
    };

    const getDifficultyBadgeClass = (difficulty) => {
        switch(difficulty) {
            case 'beginner': case 'easy': return 'badge-beginner';
            case 'intermediate': case 'medium': return 'badge-intermediate';
            case 'advanced': case 'hard': return 'badge-advanced';
            default: return 'badge-beginner';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading course...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h2 className="text-2xl font-bold mb-2">Course not found</h2>
                    <Link to="/professor" className="btn-primary mt-4">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-8 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Back Button */}
                <Link 
                    to="/professor"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 no-underline"
                >
                    <span>←</span> Back to Dashboard
                </Link>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">{course.title}</h1>
                        <span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
                            {course.difficulty}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to={`/professor/course/${id}/students`}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-[#fef483] border border-[#fef483]/30 hover:bg-[#fef483]/10 no-underline transition-colors"
                        >
                            👥 Students
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-white/10">
                    {['details', 'chapters', 'lectures', 'exercises'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px capitalize ${
                                activeTab === tab
                                    ? 'border-[#a1609d] text-[#a1609d]'
                                    : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab}
                            {tab === 'lectures' && lectures.length > 0 && (
                                <span className="ml-1.5 text-xs bg-purple-600/30 text-purple-300 px-1.5 py-0.5 rounded-full">
                                    {lectures.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'details' && (
                    <div className="surface-card rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold">Course Details</h2>
                            <button
                                onClick={() => setEditingDetails(!editingDetails)}
                                className="text-sm text-[#a1609d] hover:text-[#b870ad]"
                            >
                                {editingDetails ? 'Cancel' : 'Edit'}
                            </button>
                        </div>

                        {editingDetails ? (
                            <div className="space-y-4">
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
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                        className="w-full"
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Full Description</label>
                                    <textarea
                                        value={formData.long_description}
                                        onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                                        rows={4}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Hours</label>
                                    <input
                                        type="number"
                                        value={formData.estimated_hours}
                                        onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || 1 })}
                                        min="1"
                                        className="w-32"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.tags?.map((tag, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#a1609d]/20 text-[#a1609d] text-sm">
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== idx) })}
                                                    className="hover:text-red-400"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            placeholder="Add a tag"
                                            className="flex-1"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
                                                        setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
                                                        setTagInput('');
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
                                                    setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
                                                    setTagInput('');
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Learning Objectives</label>
                                    <ul className="space-y-2 mb-2">
                                        {formData.learning_objectives?.map((obj, idx) => (
                                            <li key={idx} className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                                                <span className="text-sm">{obj}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, learning_objectives: formData.learning_objectives.filter((_, i) => i !== idx) })}
                                                    className="text-red-400 hover:text-red-300 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={objectiveInput}
                                            onChange={(e) => setObjectiveInput(e.target.value)}
                                            placeholder="Add a learning objective"
                                            className="flex-1"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (objectiveInput.trim()) {
                                                        setFormData({ ...formData, learning_objectives: [...formData.learning_objectives, objectiveInput.trim()] });
                                                        setObjectiveInput('');
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (objectiveInput.trim()) {
                                                    setFormData({ ...formData, learning_objectives: [...formData.learning_objectives, objectiveInput.trim()] });
                                                    setObjectiveInput('');
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                                {/* Privacy Toggle */}
                                <div className="border border-white/10 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-medium text-gray-300">Private Course</label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Only students with the enrollment code can access this course.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_private: !formData.is_private })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                formData.is_private ? 'bg-[#a1609d]' : 'bg-white/20'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    formData.is_private ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    {formData.is_private && course.enrollment_code && (
                                        <div className="mt-3 p-3 bg-[#a1609d]/10 rounded-lg border border-[#a1609d]/20">
                                            <p className="text-sm text-gray-400 mb-2">Current Enrollment Code:</p>
                                            <div className="flex items-center gap-3">
                                                <code className="text-lg font-mono font-bold text-[#fef483] bg-black/30 px-4 py-2 rounded-lg tracking-widest">
                                                    {course.enrollment_code}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(course.enrollment_code);
                                                        alert('Enrollment code copied to clipboard!');
                                                    }}
                                                    className="text-sm text-gray-400 hover:text-white transition-colors"
                                                    title="Copy code"
                                                >
                                                    📋
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (window.confirm('Regenerate enrollment code? Students with the old code won\'t be able to use it anymore (already enrolled students are not affected).')) {
                                                            try {
                                                                await courseService.regenerateEnrollmentCode(id);
                                                                loadCourse();
                                                            } catch (err) {
                                                                alert('Failed to regenerate code');
                                                            }
                                                        }
                                                    }}
                                                    className="text-sm text-gray-400 hover:text-[#a1609d] transition-colors"
                                                    title="Regenerate code"
                                                >
                                                    🔄
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {formData.is_private && !course.enrollment_code && (
                                        <div className="mt-3 p-3 bg-[#a1609d]/10 rounded-lg border border-[#a1609d]/20">
                                            <p className="text-sm text-[#b870ad]">
                                                🔒 An enrollment code will be generated when you save.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleUpdateCourse}
                                    className="px-6 py-2 rounded-lg font-medium text-white"
                                    style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <span className="text-sm text-gray-400">Title</span>
                                    <p className="text-white">{course.title}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-400">Description</span>
                                    <p className="text-white">{course.description}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-400">Full Description</span>
                                    <p className="text-white">{course.long_description || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-400">Estimated Hours</span>
                                    <p className="text-white">{course.estimated_hours || 1} hours</p>
                                </div>
                                {course.tags && course.tags.length > 0 && (
                                    <div>
                                        <span className="text-sm text-gray-400">Tags</span>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {course.tags.map((tag, idx) => (
                                                <span key={idx} className="px-3 py-1 rounded-full bg-[#a1609d]/20 text-[#a1609d] text-sm">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {course.learning_objectives && course.learning_objectives.length > 0 && (
                                    <div>
                                        <span className="text-sm text-gray-400">Learning Objectives</span>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {course.learning_objectives.map((obj, idx) => (
                                                <li key={idx} className="text-white">{obj}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {/* Privacy / Enrollment Code */}
                                <div className="border border-white/10 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm text-gray-400">Visibility</span>
                                        {course.is_private ? (
                                            <span className="badge bg-[#a1609d]/20 text-[#a1609d] text-xs">🔒 Private</span>
                                        ) : (
                                            <span className="badge bg-green-500/20 text-green-400 text-xs">🌐 Public</span>
                                        )}
                                    </div>
                                    {course.is_private && course.enrollment_code && (
                                        <div className="mt-3 flex items-center gap-3">
                                            <span className="text-sm text-gray-400">Enrollment Code:</span>
                                            <code className="text-lg font-mono font-bold text-[#fef483] bg-black/30 px-4 py-2 rounded-lg tracking-widest">
                                                {course.enrollment_code}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(course.enrollment_code);
                                                    alert('Enrollment code copied to clipboard!');
                                                }}
                                                className="text-sm text-gray-400 hover:text-white transition-colors"
                                                title="Copy code"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'chapters' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Chapters</h2>
                            <button
                                onClick={() => setShowChapterModal(true)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                                style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                            >
                                + Add Chapter
                            </button>
                        </div>

                        {course.chapters?.length === 0 ? (
                            <div className="surface-card rounded-2xl p-8 text-center">
                                <p className="text-gray-400 mb-4">No chapters yet. Add your first chapter!</p>
                            </div>
                        ) : (
                            course.chapters?.map((chapter) => (
                                <div key={chapter.id} className="surface-card rounded-xl p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold">{chapter.title}</h3>
                                            <p className="text-sm text-gray-400">{chapter.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingChapter(chapter)}
                                                className="text-sm text-[#fef483] hover:text-[#fff9c4]"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteChapter(chapter.id)}
                                                className="text-sm text-red-400 hover:text-red-300"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    {/* Chapter Exercises */}
                                    {chapter.exercises && chapter.exercises.length > 0 && (
                                        <div className="mt-4 pl-4 border-l-2 border-[#a1609d]/30 space-y-2">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                                {chapter.exercises.length} Exercise{chapter.exercises.length !== 1 ? 's' : ''}
                                            </p>
                                            {chapter.exercises.map((exercise) => (
                                                <div key={exercise.id} className="flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{exercise.title}</span>
                                                        <span className={`badge text-xs ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                                                            {exercise.difficulty}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            to={`/professor/exercise/${exercise.id}`}
                                                            className="text-xs text-[#fef483] hover:text-[#fff9c4] no-underline"
                                                        >
                                                            Edit
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteExercise(exercise.id)}
                                                            className="text-xs text-red-400 hover:text-red-300"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'lectures' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Lectures</h2>
                            <button
                                onClick={() => navigate(`/professor/course/${id}/lecture/create`)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                + New Lecture
                            </button>
                        </div>

                        {lectures.length === 0 ? (
                            <div className="surface-card rounded-2xl p-12 text-center text-gray-500">
                                <p className="text-4xl mb-3">📖</p>
                                <p className="text-lg font-medium text-gray-400 mb-2">No lectures yet</p>
                                <p className="text-sm mb-6">Add multi-page lectures with videos and presentations to enrich this course.</p>
                                <button
                                    onClick={() => navigate(`/professor/course/${id}/lecture/create`)}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                                >
                                    Create First Lecture
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lectures.map((lecture) => (
                                    <div key={lecture.id} className="surface-card rounded-xl p-5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-xl flex-shrink-0">
                                                📖
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-white truncate">{lecture.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {lecture.chapter_title ? `${lecture.chapter_title} · ` : ''}
                                                    {lecture.page_count} page{lecture.page_count !== 1 ? 's' : ''}
                                                    {lecture.media_count > 0 && ` · ${lecture.media_count} media`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => navigate(`/professor/course/${id}/lecture/${lecture.id}/edit`)}
                                                className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLecture(lecture.id)}
                                                className="px-3 py-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'exercises' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Exercises</h2>
                            <div className="flex items-center gap-2">
                                <div className="relative group">
                                    <button
                                        onClick={() => handleBulkExport('json')}
                                        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 border border-white/20 hover:bg-white/5 transition-colors"
                                        title="Export exercises"
                                    >
                                        📤 Export
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-20">
                                        <div className="surface-card rounded-lg shadow-xl border border-white/10 overflow-hidden min-w-[120px]">
                                            <button onClick={() => handleBulkExport('json')} className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors">
                                                Export JSON
                                            </button>
                                            <button onClick={() => handleBulkExport('csv')} className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors">
                                                Export CSV
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBulkImportModal(true)}
                                    className="px-3 py-2 rounded-lg text-sm font-medium text-[#fef483] border border-[#fef483]/30 hover:bg-[#fef483]/10 transition-colors"
                                >
                                    📥 Bulk Import
                                </button>
                                <button
                                    onClick={() => setShowExerciseModal(true)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                                    style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                                >
                                    + Add Exercise
                                </button>
                            </div>
                        </div>

                        {course.exercises?.length === 0 ? (
                            <div className="surface-card rounded-2xl p-8 text-center">
                                <p className="text-gray-400 mb-4">No exercises yet. Add your first exercise!</p>
                            </div>
                        ) : (
                            course.exercises?.map((exercise) => (
                                <div key={exercise.id} className="surface-card rounded-xl p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{exercise.title}</h3>
                                                <span className={`badge text-xs ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                                                    {exercise.difficulty}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 line-clamp-1">{exercise.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/professor/exercise/${exercise.id}`}
                                                className="text-sm text-[#fef483] hover:text-[#fff9c4] no-underline"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteExercise(exercise.id)}
                                                className="text-sm text-red-400 hover:text-red-300"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Chapter Modal */}
                {showChapterModal && (
                    <ChapterModal
                        onClose={() => setShowChapterModal(false)}
                        onSubmit={handleAddChapter}
                    />
                )}

                {/* Edit Chapter Modal */}
                {editingChapter && (
                    <ChapterModal
                        chapter={editingChapter}
                        onClose={() => setEditingChapter(null)}
                        onSubmit={(data) => handleUpdateChapter(editingChapter.id, data)}
                    />
                )}

                {/* Exercise Modal */}
                {showExerciseModal && (
                    <ExerciseModal
                        chapters={course.chapters || []}
                        onClose={() => setShowExerciseModal(false)}
                        onSubmit={handleAddExercise}
                    />
                )}

                {/* Bulk Import Modal */}
                {showBulkImportModal && (
                    <BulkImportModal
                        onClose={() => setShowBulkImportModal(false)}
                        onImport={handleBulkImport}
                    />
                )}
            </div>
        </div>
    );
};

// Chapter Modal Component
const ChapterModal = ({ chapter, onClose, onSubmit }) => {
    const [title, setTitle] = useState(chapter?.title || '');
    const [description, setDescription] = useState(chapter?.description || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ title, description });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="surface-card rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">
                    {chapter ? 'Edit Chapter' : 'Add Chapter'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg font-medium text-white"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                        >
                            {chapter ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Exercise Modal Component
const ExerciseModal = ({ chapters, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'easy',
        language: 'javascript',
        starterCode: '',
        chapter_id: '',
        requires_efficiency: false,
        time_limit_minutes: '',
        is_multi_file: false,
    });

    // Multi-file state
    const [files, setFiles] = useState([]);
    const [newFileName, setNewFileName] = useState('');

    const handleAddFile = () => {
        if (!newFileName.trim()) return;
        if (files.find(f => f.filename === newFileName.trim())) {
            alert('A file with this name already exists');
            return;
        }
        setFiles([...files, { filename: newFileName.trim(), starter_code: '', is_entry_point: files.length === 0, display_order: files.length }]);
        setNewFileName('');
    };

    const handleRemoveFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            chapter_id: formData.chapter_id || null,
            time_limit_minutes: formData.time_limit_minutes || null,
        };
        if (formData.is_multi_file) {
            submitData.files = files;
        }
        onSubmit(submitData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="surface-card rounded-2xl p-6 w-full max-w-lg my-8">
                <h3 className="text-xl font-semibold mb-4">Add Exercise</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            rows={3}
                            className="w-full"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                    {chapters.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Chapter (optional)</label>
                            <select
                                value={formData.chapter_id}
                                onChange={(e) => setFormData({ ...formData, chapter_id: e.target.value })}
                                className="w-full"
                            >
                                <option value="">No chapter</option>
                                {chapters.map((ch) => (
                                    <option key={ch.id} value={ch.id}>{ch.title}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Starter Code</label>
                        <textarea
                            value={formData.starterCode}
                            onChange={(e) => setFormData({ ...formData, starterCode: e.target.value })}
                            rows={5}
                            className={`w-full font-mono text-sm ${formData.is_multi_file ? 'opacity-50' : ''}`}
                            placeholder="// Starter code for students"
                            disabled={formData.is_multi_file}
                        />
                        {formData.is_multi_file && (
                            <p className="text-xs text-gray-500 mt-1">Starter code is set per file in multi-file mode.</p>
                        )}
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                        <input
                            type="checkbox"
                            id="is_multi_file_create"
                            checked={formData.is_multi_file}
                            onChange={(e) => setFormData({ ...formData, is_multi_file: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-600 accent-cyan-500"
                        />
                        <div>
                            <label htmlFor="is_multi_file_create" className="text-sm font-medium text-gray-300 cursor-pointer flex items-center gap-2">
                                📁 Multi-File Exercise
                            </label>
                            <p className="text-xs text-gray-500">Students work with multiple files (e.g., class + test file)</p>
                        </div>
                    </div>
                    {formData.is_multi_file && (
                        <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-3">
                            <h4 className="text-sm font-medium text-cyan-300 flex items-center gap-2">📁 Exercise Files</h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    placeholder={`e.g., Calculator.${formData.language === 'python' ? 'py' : formData.language === 'java' ? 'java' : 'js'}`}
                                    className="flex-1 font-mono text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFile())}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddFile}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
                                >
                                    + Add
                                </button>
                            </div>
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/10">
                                            <span className="font-mono text-xs text-gray-300 flex-1">{file.filename}</span>
                                            {file.is_entry_point && (
                                                <span className="text-[9px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">▶ Entry</span>
                                            )}
                                            {!file.is_entry_point && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFiles(files.map((f, i) => ({ ...f, is_entry_point: i === idx })))}
                                                    className="text-[9px] text-gray-500 hover:text-green-400"
                                                >
                                                    Set Entry
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile(idx)}
                                                className="text-xs text-red-400 hover:text-red-300"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-[10px] text-gray-500">You can edit starter code for each file after creating the exercise (Edit Exercise → Files tab).</p>
                        </div>
                    )}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                        <input
                            type="checkbox"
                            id="requires_efficiency"
                            checked={formData.requires_efficiency}
                            onChange={(e) => setFormData({ ...formData, requires_efficiency: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-600 accent-[#a1609d]"
                        />
                        <div>
                            <label htmlFor="requires_efficiency" className="text-sm font-medium text-gray-300 cursor-pointer">Require Efficient Solution</label>
                            <p className="text-xs text-gray-500">Students must achieve optimal time complexity for full marks (80% for correct but inefficient)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-300 mb-1 block">⏱ Time Limit (Quiz Mode)</label>
                            <p className="text-xs text-gray-500 mb-2">Set a countdown timer for exam-like conditions. Leave empty for no limit.</p>
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
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg font-medium text-white"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                        >
                            Add Exercise
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCourse;

// ─── Bulk Import Modal Component ────────────────────────────────────────────────
const BulkImportModal = ({ onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);

    const parseCSV = (text) => {
        // Simple CSV parser supporting quoted fields
        const lines = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '"') {
                if (inQuotes && text[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === '\n' && !inQuotes) {
                lines.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        if (current.trim()) lines.push(current);

        if (lines.length < 2) return [];

        const splitRow = (row) => {
            const fields = [];
            let field = '';
            let insideQuotes = false;
            for (let i = 0; i < row.length; i++) {
                const c = row[i];
                if (c === '"') {
                    if (insideQuotes && row[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        insideQuotes = !insideQuotes;
                    }
                } else if (c === ',' && !insideQuotes) {
                    fields.push(field);
                    field = '';
                } else {
                    field += c;
                }
            }
            fields.push(field);
            return fields;
        };

        const headers = splitRow(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ''));
        const results = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = splitRow(lines[i]);
            const obj = {};
            headers.forEach((header, idx) => {
                obj[header] = values[idx] !== undefined ? values[idx].trim() : '';
            });

            // Map CSV fields to exercise structure
            const exercise = {
                title: obj.title || '',
                description: obj.description || '',
                difficulty: obj.difficulty || 'easy',
                language: obj.language || 'javascript',
                starterCode: obj.starterCode || obj.starter_code || '',
                chapter: obj.chapter || null,
                requires_efficiency: obj.requires_efficiency === 'true',
                time_limit_minutes: obj.time_limit_minutes ? parseInt(obj.time_limit_minutes) : null,
            };

            // Parse testCases if present (should be JSON-encoded)
            if (obj.testCases || obj.test_cases) {
                try {
                    exercise.testCases = JSON.parse(obj.testCases || obj.test_cases);
                } catch {
                    exercise.testCases = [];
                }
            }

            results.push(exercise);
        }

        return results;
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');
        setPreview(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            try {
                let exercises;
                if (selectedFile.name.endsWith('.json')) {
                    const parsed = JSON.parse(content);
                    exercises = parsed.exercises || (Array.isArray(parsed) ? parsed : [parsed]);
                } else if (selectedFile.name.endsWith('.csv')) {
                    exercises = parseCSV(content);
                } else {
                    setError('Please upload a .json or .csv file');
                    return;
                }

                if (!exercises || exercises.length === 0) {
                    setError('No exercises found in file');
                    return;
                }

                // Validate
                const invalid = exercises.filter(ex => !ex.title || !ex.description);
                if (invalid.length > 0) {
                    setError(`${invalid.length} exercise(s) are missing title or description`);
                }

                setPreview(exercises);
            } catch (err) {
                setError(`Failed to parse file: ${err.message}`);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleImport = async () => {
        if (!preview || preview.length === 0) return;
        setImporting(true);
        try {
            await onImport(preview);
        } finally {
            setImporting(false);
        }
    };

    const sampleJSON = `[
  {
    "title": "Two Sum",
    "description": "Return indices of two numbers that add up to target.",
    "difficulty": "easy",
    "language": "javascript",
    "starterCode": "function twoSum(nums, target) {\\n  // code here\\n}",
    "chapter": "Arrays",
    "requires_efficiency": false,
    "time_limit_minutes": null,
    "testCases": [
      { "input": "[[2,7,11,15], 9]", "expectedOutput": "[0,1]", "isHidden": false, "weight": 1 }
    ]
  }
]`;

    const sampleCSV = `title,description,difficulty,language,starterCode,chapter,requires_efficiency,time_limit_minutes,testCases
"Two Sum","Return indices of two numbers that add up to target.","easy","javascript","function twoSum(nums, target) {\\n  // code here\\n}","Arrays",false,,"[{\\"input\\":\\"[[2,7,11,15], 9]\\",\\"expectedOutput\\":\\"[0,1]\\",\\"isHidden\\":false,\\"weight\\":1}]"`;

    const [showSample, setShowSample] = useState('');

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="surface-card rounded-2xl p-6 w-full max-w-2xl my-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">📥 Bulk Import Exercises</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                    Upload a JSON or CSV file containing exercises to import them all at once.
                </p>

                {/* Sample format toggle */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setShowSample(showSample === 'json' ? '' : 'json')}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            showSample === 'json' ? 'border-[#a1609d] text-[#a1609d] bg-[#a1609d]/10' : 'border-white/20 text-gray-400 hover:text-white'
                        }`}
                    >
                        View JSON format
                    </button>
                    <button
                        onClick={() => setShowSample(showSample === 'csv' ? '' : 'csv')}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            showSample === 'csv' ? 'border-[#a1609d] text-[#a1609d] bg-[#a1609d]/10' : 'border-white/20 text-gray-400 hover:text-white'
                        }`}
                    >
                        View CSV format
                    </button>
                </div>

                {showSample && (
                    <div className="mb-4 p-3 bg-black/30 rounded-lg border border-white/10 overflow-x-auto">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500 uppercase">{showSample} format example</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(showSample === 'json' ? sampleJSON : sampleCSV);
                                    alert('Sample copied to clipboard!');
                                }}
                                className="text-xs text-gray-400 hover:text-white"
                            >
                                📋 Copy
                            </button>
                        </div>
                        <pre className="text-xs text-gray-300 font-mono whitespace-pre overflow-x-auto">
                            {showSample === 'json' ? sampleJSON : sampleCSV}
                        </pre>
                    </div>
                )}

                {/* File upload area */}
                <div className="mb-4">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#a1609d]/50 hover:bg-[#a1609d]/5 transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <span className="text-3xl mb-2">📄</span>
                            <p className="text-sm text-gray-400">
                                {file ? file.name : 'Click to upload JSON or CSV file'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Supports .json and .csv</p>
                        </div>
                        <input
                            type="file"
                            accept=".json,.csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>

                {/* Error message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                        ⚠️ {error}
                    </div>
                )}

                {/* Preview */}
                {preview && preview.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                            Preview — {preview.length} exercise(s) found
                        </h4>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {preview.map((ex, idx) => (
                                <div key={idx} className="p-3 bg-black/20 rounded-lg border border-white/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-white">{ex.title || '(untitled)'}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            ex.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                                            ex.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-green-500/20 text-green-400'
                                        }`}>
                                            {ex.difficulty || 'easy'}
                                        </span>
                                        <span className="text-xs text-gray-500">{ex.language || 'javascript'}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-1">{ex.description || '(no description)'}</p>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-xs text-gray-500">
                                            {(ex.testCases || []).length} test case(s)
                                        </span>
                                        {ex.chapter && <span className="text-xs text-gray-500">📂 {ex.chapter}</span>}
                                        {ex.requires_efficiency && <span className="text-xs text-[#a1609d]">⚡ Efficiency</span>}
                                        {ex.time_limit_minutes && <span className="text-xs text-[#fef483]">⏱ {ex.time_limit_minutes}min</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!preview || preview.length === 0 || importing}
                        className="px-6 py-2 rounded-lg font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                    >
                        {importing ? 'Importing...' : `Import ${preview ? preview.length : 0} Exercise(s)`}
                    </button>
                </div>
            </div>
        </div>
    );
};
