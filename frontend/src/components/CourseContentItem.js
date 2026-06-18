import React from 'react';
import './CourseContentItem.css';

const CourseContentItem = ({ item, index, totalItems, onClick }) => {
    const isLecture = item.type === 'lecture';
    const isCompleted = item.completed;

    return (
        <div
            className={`course-content-item ${isLecture ? 'lecture-item' : 'exercise-item'} ${
                isCompleted ? 'completed' : ''
            }`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onClick();
                }
            }}
        >
            <div className="item-icon">
                {isLecture ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                    </svg>
                )}
            </div>

            <div className="item-content">
                <div className="item-header">
                    <span className="item-type">{isLecture ? 'Lecture' : 'Exercise'}</span>
                    <h4 className="item-title">{item.title}</h4>
                </div>

                {!isLecture && item.difficulty && (
                    <span className={`difficulty-badge ${item.difficulty.toLowerCase()}`}>
                        {item.difficulty}
                    </span>
                )}

                {isLecture && item.page_count > 0 && (
                    <div className="item-meta">
                        <span className="page-count">
                            {item.page_count} {item.page_count === 1 ? 'page' : 'pages'}
                        </span>
                        {item.media_count > 0 && (
                            <span className="media-count">
                                • {item.media_count} media
                            </span>
                        )}
                    </div>
                )}

                {!isLecture && item.attempts > 0 && (
                    <div className="item-meta">
                        <span className="attempts">
                            {item.attempts} {item.attempts === 1 ? 'attempt' : 'attempts'}
                        </span>
                        {item.best_score && (
                            <span className="best-score">
                                • Best: {Math.round(item.best_score)}%
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="item-actions">
                <div className="completion-indicator">
                    {isCompleted ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="completed-icon">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9 12.5L11 14.5L15 10" stroke="white" strokeWidth="2" fill="none" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="incomplete-icon">
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseContentItem;
