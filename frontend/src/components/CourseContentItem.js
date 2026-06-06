import React from 'react';
import { BookOpen, Code, CheckCircle, Circle } from 'lucide-react';
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
                    <BookOpen size={20} className="lecture-icon" />
                ) : (
                    <Code size={20} className="exercise-icon" />
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
                        <CheckCircle size={24} className="completed-icon" />
                    ) : (
                        <Circle size={24} className="incomplete-icon" />
                    )}
                </div>
                <button className="item-button">
                    {isCompleted ? 'Review' : 'Start'}
                </button>
            </div>
        </div>
    );
};

export default CourseContentItem;
