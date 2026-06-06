import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Code } from 'lucide-react';
import CourseContentItem from './CourseContentItem';
import './ChapterLearningPath.css';

const ChapterLearningPath = ({ chapter, onItemClick, userProgress, submissions }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!chapter || !chapter.items || chapter.items.length === 0) {
        return null;
    }

    const completedCount = chapter.items.filter(item => item.completed).length;
    const totalCount = chapter.items.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="chapter-learning-path">
            <div className="chapter-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="chapter-header-left">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    <div className="chapter-info">
                        <h3 className="chapter-title">{chapter.title}</h3>
                        {chapter.description && (
                            <p className="chapter-description">{chapter.description}</p>
                        )}
                    </div>
                </div>
                <div className="chapter-progress">
                    <span className="progress-text">
                        {completedCount}/{totalCount} complete
                    </span>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="chapter-items">
                    {chapter.items.map((item, index) => (
                        <CourseContentItem
                            key={`${item.type}-${item.id}`}
                            item={item}
                            index={index}
                            totalItems={chapter.items.length}
                            onClick={() => onItemClick(item)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChapterLearningPath;
