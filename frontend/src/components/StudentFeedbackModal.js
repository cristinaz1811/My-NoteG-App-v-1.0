import React, { useState } from 'react';
import '../styles/FeedbackModal.css';

const StudentFeedbackModal = ({ student, courseId, onClose, onSubmit, isLoading }) => {
    const [feedbackText, setFeedbackText] = useState('');
    const [category, setCategory] = useState('general');
    const [isPositive, setIsPositive] = useState(true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedbackText.trim()) {
            alert('Please enter feedback text');
            return;
        }

        await onSubmit({
            feedbackText,
            category,
            isPositive
        });

        setFeedbackText('');
        setCategory('general');
        setIsPositive(true);
    };

    return (
        <div className="feedback-modal-overlay" onClick={onClose}>
            <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
                <div className="feedback-modal-header">
                    <h2>Give Feedback</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="feedback-modal-content">
                    <div className="student-info">
                        <p className="student-name">{student?.username}</p>
                        <p className="student-email">{student?.email}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="feedback-form">
                        <div className="form-group">
                            <label>Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="form-select"
                            >
                                <option value="general">General Feedback</option>
                                <option value="performance">Performance</option>
                                <option value="effort">Effort & Engagement</option>
                                <option value="improvement">Areas for Improvement</option>
                                <option value="strengths">Strengths</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Feedback</label>
                            <textarea
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Write your feedback here..."
                                className="form-textarea"
                                rows="6"
                            />
                            <p className="char-count">{feedbackText.length} characters</p>
                        </div>

                        <div className="form-group sentiment">
                            <label>Sentiment</label>
                            <div className="sentiment-buttons">
                                <button
                                    type="button"
                                    onClick={() => setIsPositive(true)}
                                    className={`sentiment-btn positive ${isPositive ? 'active' : ''}`}
                                >
                                    👍 Positive
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPositive(false)}
                                    className={`sentiment-btn negative ${!isPositive ? 'active' : ''}`}
                                >
                                    🤔 Constructive
                                </button>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Send Feedback'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentFeedbackModal;
