-- Migration: Add plagiarism detection tables
-- Stores plagiarism scan results and individual flagged pairs

-- Plagiarism scan reports (one per exercise scan)
CREATE TABLE IF NOT EXISTS plagiarism_reports (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    initiated_by INTEGER REFERENCES users(id),
    total_submissions_compared INTEGER DEFAULT 0,
    flagged_pairs INTEGER DEFAULT 0,
    max_similarity DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Individual flagged pairs within a report
CREATE TABLE IF NOT EXISTS plagiarism_matches (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES plagiarism_reports(id) ON DELETE CASCADE,
    submission_a_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    submission_b_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    user_a_id INTEGER REFERENCES users(id),
    user_b_id INTEGER REFERENCES users(id),
    similarity_score DECIMAL(5,2) NOT NULL,
    matching_tokens INTEGER DEFAULT 0,
    total_tokens_a INTEGER DEFAULT 0,
    total_tokens_b INTEGER DEFAULT 0,
    matching_fragments JSONB DEFAULT '[]',
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_verdict VARCHAR(20) CHECK (review_verdict IN ('plagiarism', 'coincidence', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table for plagiarism alerts to professors
CREATE TABLE IF NOT EXISTS plagiarism_notifications (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES plagiarism_reports(id) ON DELETE CASCADE,
    professor_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_course ON plagiarism_reports(course_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_exercise ON plagiarism_reports(exercise_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_matches_report ON plagiarism_matches(report_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_matches_similarity ON plagiarism_matches(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_plagiarism_notifications_professor ON plagiarism_notifications(professor_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_notifications_unread ON plagiarism_notifications(professor_id, is_read) WHERE is_read = FALSE;
