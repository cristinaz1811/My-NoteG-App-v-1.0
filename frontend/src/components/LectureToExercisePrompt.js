import React from 'react';
import './NavigationPrompt.css';

const LectureToExercisePrompt = ({ nextExercise, onStart, onSkip, onClose }) => {
    if (!nextExercise) {
        return null;
    }

    return (
        <div className="navigation-prompt-overlay" onClick={onClose}>
            <div className="navigation-prompt" onClick={(e) => e.stopPropagation()}>
                <div className="prompt-icon-container exercise-icon-container">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                </div>

                <h2 className="prompt-title">Great job! Ready for an exercise?</h2>

                <div className="exercise-preview">
                    <h3 className="exercise-title">{nextExercise.title}</h3>
                    {nextExercise.difficulty && (
                        <span className={`difficulty-badge ${nextExercise.difficulty.toLowerCase()}`}>
                            {nextExercise.difficulty}
                        </span>
                    )}
                </div>

                <p className="prompt-description">
                    Test your knowledge with a hands-on exercise. You can always skip and come back later.
                </p>

                <div className="prompt-actions">
                    <button className="btn-start" onClick={onStart}>
                        <span>Start Exercise</span>
                        <span>→</span>
                    </button>
                    <button className="btn-skip" onClick={onSkip}>
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LectureToExercisePrompt;
