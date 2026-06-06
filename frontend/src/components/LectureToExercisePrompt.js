import React from 'react';
import { Code, ChevronRight } from 'lucide-react';
import './NavigationPrompt.css';

const LectureToExercisePrompt = ({ nextExercise, onStart, onSkip, onClose }) => {
    if (!nextExercise) {
        return null;
    }

    return (
        <div className="navigation-prompt-overlay" onClick={onClose}>
            <div className="navigation-prompt" onClick={(e) => e.stopPropagation()}>
                <div className="prompt-icon-container exercise-icon-container">
                    <Code size={48} />
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
                        <ChevronRight size={20} />
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
