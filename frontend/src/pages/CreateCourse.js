import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { courseService } from '../services/api';

const CreateCourse = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'beginner',
        language: 'javascript',
        long_description: '',
        estimated_hours: 1,
        tags: [],
        learning_objectives: [],
        is_private: false
    });
    const [tagInput, setTagInput] = useState('');
    const [objectiveInput, setObjectiveInput] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const handleAddObjective = () => {
        if (objectiveInput.trim()) {
            setFormData(prev => ({ 
                ...prev, 
                learning_objectives: [...prev.learning_objectives, objectiveInput.trim()] 
            }));
            setObjectiveInput('');
        }
    };

    const handleRemoveObjective = (index) => {
        setFormData(prev => ({ 
            ...prev, 
            learning_objectives: prev.learning_objectives.filter((_, i) => i !== index) 
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await courseService.createProfessorCourse(formData);
            navigate(`/professor/course/${response.data.id}`);
        } catch (error) {
            console.error('Error creating course:', error);
            alert(error.response?.data?.error || 'Failed to create course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-8 px-6">
            <div className="max-w-3xl mx-auto">
                {/* Back Button */}
                <Link 
                    to="/professor"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 no-underline"
                >
                    <span>←</span> Back to Dashboard
                </Link>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create New Course</h1>
                    <p className="text-gray-400">Fill in the details to create your new course.</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="surface-card rounded-2xl p-6 space-y-5">
                        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Course Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g., Introduction to Python"
                                required
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Short Description *
                            </label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="A brief description of your course"
                                required
                                className="w-full"
                            />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Difficulty Level *
                                </label>
                                <select
                                    name="difficulty"
                                    value={formData.difficulty}
                                    onChange={handleChange}
                                    className="w-full"
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Programming Language *
                                </label>
                                <select
                                    name="language"
                                    value={formData.language}
                                    onChange={handleChange}
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

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Estimated Hours
                            </label>
                            <input
                                type="number"
                                name="estimated_hours"
                                value={formData.estimated_hours}
                                onChange={handleChange}
                                min="1"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Full Description
                            </label>
                            <textarea
                                name="long_description"
                                value={formData.long_description}
                                onChange={handleChange}
                                placeholder="A detailed description of what students will learn..."
                                rows={4}
                                className="w-full"
                            />
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
                                    onClick={() => setFormData(prev => ({ ...prev, is_private: !prev.is_private }))}
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
                            {formData.is_private && (
                                <div className="mt-3 p-3 bg-[#a1609d]/10 rounded-lg border border-[#a1609d]/20">
                                    <p className="text-sm text-[#b870ad]">
                                        🔒 An enrollment code will be generated automatically when you create this course. You can share it with your students.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="surface-card rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Tags</h2>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                placeholder="Add a tag..."
                                className="flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            />
                            <button 
                                type="button"
                                onClick={handleAddTag}
                                className="px-4 py-2 rounded-lg bg-[#a1609d] text-white font-medium"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.tags.map((tag, i) => (
                                <span 
                                    key={i}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-white/10"
                                >
                                    {tag}
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="text-gray-400 hover:text-red-400 ml-1"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Learning Objectives */}
                    <div className="surface-card rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Learning Objectives</h2>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={objectiveInput}
                                onChange={(e) => setObjectiveInput(e.target.value)}
                                placeholder="What will students learn?"
                                className="flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddObjective())}
                            />
                            <button 
                                type="button"
                                onClick={handleAddObjective}
                                className="px-4 py-2 rounded-lg bg-[#a1609d] text-white font-medium"
                            >
                                Add
                            </button>
                        </div>
                        <ul className="space-y-2">
                            {formData.learning_objectives.map((obj, i) => (
                                <li 
                                    key={i}
                                    className="flex items-center gap-2 text-gray-300"
                                >
                                    <span className="text-[#fef483]">✓</span>
                                    <span className="flex-1">{obj}</span>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveObjective(i)}
                                        className="text-gray-400 hover:text-red-400"
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-4">
                        <Link
                            to="/professor"
                            className="px-6 py-3 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors no-underline"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
                        >
                            {loading ? 'Creating...' : 'Create Course'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCourse;
