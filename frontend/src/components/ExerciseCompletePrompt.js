import React from 'react';
import './NavigationPrompt.css';

const ExerciseCompletePrompt = ({ score, nextItem, isChapterComplete, onContinue, onClose }) => {
    return (
        <div className="navigation-prompt-overlay" onClick={onClose}>
            <div className="navigation-prompt success" onClick={(e) => e.stopPropagation()}>
                <div className="prompt-icon-container success-icon-container">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 4h12v3H6z" />
                        <path d="M8 7v6c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V7" />
                        <path d="M6 13h12v2H6z" />
                        <path d="M9 15v3h6v-3" />
                        <path d="M11 18h2v1h-2z" />
                    </svg>
                </div>

                <h2 className="prompt-title">
                    {isChapterComplete ? '🎉 Chapter Complete!' : 'Excellent!'}
                </h2>

                {score && (
                    <div className="score-display">
                        <span className="score-value">{Math.round(score)}%</span>
                        <span className="score-label">Score</span>
                    </div>
                )}

                {nextItem && !isChapterComplete && (
                    <div className="next-item-preview">
                        <p className="next-item-label">Next: {nextItem.type === 'lecture' ? 'Lecture' : 'Exercise'}</p>
                        <h3 className="next-item-title">{nextItem.title}</h3>
                    </div>
                )}

                {isChapterComplete && (
                    <div className="chapter-complete-message">
                        <p>You've completed all items in this chapter!</p>
                        <p className="continue-text">Continue to the next chapter</p>
                    </div>
                )}

                <div className="prompt-actions">
                    <button className="btn-start" onClick={onContinue}>
                        <span>{isChapterComplete ? 'Continue' : nextItem?.type === 'lecture' ? 'Next Lecture' : 'Next Exercise'}</span>
                        <span>→</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExerciseCompletePrompt;
