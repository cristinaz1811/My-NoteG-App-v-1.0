-- Student Feedback from Professors
CREATE TABLE IF NOT EXISTS student_feedback (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    professor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    feedback_category VARCHAR(50) DEFAULT 'general' CHECK (feedback_category IN ('general', 'code_quality', 'performance', 'understanding', 'effort')),
    is_positive BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_student_feedback_student_id ON student_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_course_id ON student_feedback(course_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_professor_id ON student_feedback(professor_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_student_course ON student_feedback(student_id, course_id);
