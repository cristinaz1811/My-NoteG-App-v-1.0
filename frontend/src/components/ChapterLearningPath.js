import React, { useState } from 'react';
import CourseContentItem from './CourseContentItem';
import './ChapterLearningPath.css';

const ChapterLearningPath = ({ chapter, onItemClick, userProgress, submissions }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!chapter || !chapter.items || chapter.items.length === 0) {
        return null;
    }

    return (
        <div className="chapter-learning-path">
            <div className="chapter-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="chapter-header-left">
                    <span className="chevron" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>›</span>
                    <div className="chapter-info">
                        <h3 className="chapter-title">{chapter.title}</h3>
                        {chapter.description && (
                            <p className="chapter-description">{chapter.description}</p>
                        )}
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
