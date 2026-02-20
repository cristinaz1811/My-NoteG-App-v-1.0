import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService, exerciseService } from '../services/api';

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
    const [editingChapter, setEditingChapter] = useState(null);
    const [editingExercise, setEditingExercise] = useState(null);
    const [tagInput, setTagInput] = useState('');
    const [objectiveInput, setObjectiveInput] = useState('');

    useEffect(() => {
        loadCourse();
    }, [id]);

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
                        <Link
                            to={`/courses/${id}`}
                            className="px-4 py-2 rounded-lg text-sm border border-white/20 text-gray-300 hover:bg-white/5 no-underline"
                            target="_blank"
                        >
                            View as Student →
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-white/10">
                    {['details', 'chapters', 'exercises'].map((tab) => (
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

                {activeTab === 'exercises' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Exercises</h2>
                            <button
                                onClick={() => setShowExerciseModal(true)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                                style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                            >
                                + Add Exercise
                            </button>
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
        chapter_id: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            chapter_id: formData.chapter_id || null
        });
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
                            className="w-full font-mono text-sm"
                            placeholder="// Starter code for students"
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
                            Add Exercise
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCourse;
