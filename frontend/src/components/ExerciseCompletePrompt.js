import React from 'react';
import { Trophy, ChevronRight, CheckCircle } from 'lucide-react';
import './NavigationPrompt.css';

const ExerciseCompletePrompt = ({ score, nextItem, isChapterComplete, onContinue, onClose }) => {
    return (
        <div className="navigation-prompt-overlay" onClick={onClose}>
            <div className="navigation-prompt success" onClick={(e) => e.stopPropagation()}>
                <div className="prompt-icon-container success-icon-container">
                    <Trophy size={48} />
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
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExerciseCompletePrompt;
