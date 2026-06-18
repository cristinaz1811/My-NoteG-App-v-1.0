import React, { useState } from 'react';
import RichTextEditor from './RichTextEditor';

const ExercisePreview = ({
  formData,
  testCases = [],
  onDescriptionChange,
  onTestCaseAdd,
  onTestCaseUpdate,
  onTestCaseDelete,
  isEditable = true
}) => {
  const [expandedTestCases, setExpandedTestCases] = useState({});
  const [newTestCase, setNewTestCase] = useState({
    input: '',
    expected_output: '',
    is_hidden: false,
    weight: 1
  });
  const [editingTestCaseId, setEditingTestCaseId] = useState(null);
  const [editTestCaseData, setEditTestCaseData] = useState({});

  const getDifficultyBadgeClass = (difficulty) => {
    switch(difficulty) {
      case 'easy': return 'badge-beginner';
      case 'medium': return 'badge-intermediate';
      case 'hard': return 'badge-advanced';
      default: return 'badge-beginner';
    }
  };

  const toggleTestCaseExpand = (id) => {
    setExpandedTestCases(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const startEditTestCase = (testCase) => {
    setEditingTestCaseId(testCase.id);
    setEditTestCaseData({
      input: testCase.input,
      expected_output: testCase.expected_output,
      is_hidden: testCase.is_hidden,
      weight: testCase.weight
    });
  };

  const saveTestCaseEdit = () => {
    if (onTestCaseUpdate) {
      onTestCaseUpdate(editingTestCaseId, editTestCaseData);
    }
    setEditingTestCaseId(null);
    setEditTestCaseData({});
  };

  const handleAddTestCase = () => {
    if (!newTestCase.input || !newTestCase.expected_output) {
      alert('Input and expected output are required');
      return;
    }
    if (onTestCaseAdd) {
      onTestCaseAdd(newTestCase);
    }
    setNewTestCase({
      input: '',
      expected_output: '',
      is_hidden: false,
      weight: 1
    });
  };

  // Filter test cases based on mode
  // In edit mode: show all. In preview mode: show only visible (like students see)
  const displayedTestCases = isEditable ? testCases : testCases.filter(tc => !tc.is_hidden);

  return (
    <div className="p-6 space-y-6">
      {/* Exercise Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className={`badge ${getDifficultyBadgeClass(formData.difficulty || 'easy')}`}>
            {formData.difficulty || 'easy'}
          </span>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
            {formData.language || 'javascript'}
          </span>
          {formData.time_limit_minutes && (
            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {formData.time_limit_minutes} min
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold">{formData.title || 'Untitled Exercise'}</h1>
      </div>

      {/* Description Editor */}
      <div className="surface-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Description</h3>
        {isEditable ? (
          <RichTextEditor
            value={formData.description || ''}
            onChange={onDescriptionChange}
            placeholder="Enter exercise description..."
          />
        ) : (
          <div
            className="prose prose-invert max-w-none text-gray-300 leading-relaxed
              [&_p]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2
              [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2
              [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-3
              [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-3
              [&_li]:mb-1
              [&_code]:bg-gray-800 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-sm
              [&_a]:text-blue-400 [&_a]:hover:text-blue-300
              [&_blockquote]:border-l-4 [&_blockquote]:border-gray-500 [&_blockquote]:pl-4 [&_blockquote]:italic
              [&_pre]:bg-gray-800 [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:mb-3
              [&_strong]:font-bold
              [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: formData.description || '<p>(No description)</p>' }}
          />
        )}
      </div>

      {/* Test Cases Editor */}
      <div className="surface-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Example Test Cases ({displayedTestCases.length})
        </h3>

        {isEditable && (
          <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Input</label>
                <textarea
                  value={newTestCase.input}
                  onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-white/10 rounded text-gray-100 text-xs font-mono resize-none"
                  placeholder="e.g., [1, 2, 3]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Expected Output</label>
                <textarea
                  value={newTestCase.expected_output}
                  onChange={(e) => setNewTestCase({ ...newTestCase, expected_output: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-white/10 rounded text-gray-100 text-xs font-mono resize-none"
                  placeholder="e.g., 6"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={newTestCase.is_hidden}
                  onChange={(e) => setNewTestCase({ ...newTestCase, is_hidden: e.target.checked })}
                  className="w-3 h-3"
                />
                <span className="text-gray-300">Hidden (not visible to students)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-400">Weight:</label>
                <input
                  type="number"
                  value={newTestCase.weight}
                  onChange={(e) => setNewTestCase({ ...newTestCase, weight: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-12 px-1.5 py-0.5 bg-gray-800 border border-white/10 rounded text-gray-100 text-xs text-center"
                />
              </div>
            </div>
            <button
              onClick={handleAddTestCase}
              className="w-full px-3 py-1.5 rounded text-xs font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #a1609d, #b870ad)' }}
            >
              + Add Test Case
            </button>
          </div>
        )}

        {/* Test Cases List */}
        <div className="space-y-3">
          {displayedTestCases.map((testCase, index) => (
            <div key={testCase.id} className="bg-black/20 rounded-lg p-4 border border-white/5">
              {editingTestCaseId === testCase.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Input</label>
                      <textarea
                        value={editTestCaseData.input}
                        onChange={(e) => setEditTestCaseData({ ...editTestCaseData, input: e.target.value })}
                        rows={2}
                        className="w-full px-2 py-1 bg-gray-700 border border-white/10 rounded text-gray-100 text-xs font-mono resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Expected Output</label>
                      <textarea
                        value={editTestCaseData.expected_output}
                        onChange={(e) => setEditTestCaseData({ ...editTestCaseData, expected_output: e.target.value })}
                        rows={2}
                        className="w-full px-2 py-1 bg-gray-700 border border-white/10 rounded text-gray-100 text-xs font-mono resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={editTestCaseData.is_hidden}
                        onChange={(e) => setEditTestCaseData({ ...editTestCaseData, is_hidden: e.target.checked })}
                        className="w-3 h-3"
                      />
                      <span>Hidden</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Weight:</span>
                      <input
                        type="number"
                        value={editTestCaseData.weight}
                        onChange={(e) => setEditTestCaseData({ ...editTestCaseData, weight: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-10 px-1 py-0.5 bg-gray-700 border border-white/10 rounded text-gray-100 text-xs text-center"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveTestCaseEdit}
                      className="flex-1 px-2 py-1.5 rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      ✓ Save
                    </button>
                    <button
                      onClick={() => setEditingTestCaseId(null)}
                      className="flex-1 px-2 py-1.5 rounded text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Test Case {index + 1}</span>
                      {isEditable && testCase.is_hidden && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">🔒 Hidden</span>
                      )}
                    </div>
                    {isEditable && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditTestCase(testCase)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => onTestCaseDelete && onTestCaseDelete(testCase.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          ✕ Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <div>
                      <span className="text-gray-500">Input: </span>
                      <span className="text-[#fef483]">{testCase.input}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Expected: </span>
                      <span className="text-green-400">{testCase.expected_output}</span>
                    </div>
                    {isEditable && (
                      <div className="text-xs text-gray-500 pt-1">
                        {testCase.is_hidden && <span className="mr-2">🔒 Hidden</span>}
                        Weight: {testCase.weight}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info for professors */}
      {isEditable && (
        <div className="surface-card rounded-xl p-5 border border-purple-500/20 bg-purple-500/5">
          <h3 className="text-sm font-semibold text-purple-300 mb-2">👨‍🏫 Professor View</h3>
          <p className="text-xs text-gray-400">
            Edit the description using the rich text editor. Hidden test cases won't appear to students. Changes save when you click "Save Changes".
          </p>
        </div>
      )}
    </div>
  );
};

export default ExercisePreview;
