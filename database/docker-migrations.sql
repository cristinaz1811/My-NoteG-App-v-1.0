-- Combined migrations for Docker initialization
-- This file runs all migrations (001–010) in a single pass.
-- In Docker, it executes AFTER docker-init.sql (the base schema).

-- ═══════════════════════════════════════════════════════════════════════════
-- 001: Time tracking
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS time_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_time_sessions_user ON time_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_course ON time_sessions(course_id);

CREATE OR REPLACE VIEW user_course_stats AS
SELECT 
    e.user_id,
    e.course_id,
    c.title as course_title,
    c.difficulty,
    e.enrolled_at,
    e.total_time_spent,
    COALESCE(stats.total_attempts, 0) as total_attempts,
    COALESCE(stats.avg_score, 0) as average_score,
    COALESCE(stats.exercises_completed, 0) as exercises_completed,
    COALESCE(stats.total_exercises, 0) as total_exercises
FROM enrollments e
JOIN courses c ON e.course_id = c.id
LEFT JOIN (
    SELECT 
        ex.course_id,
        s.user_id,
        COUNT(s.id) as total_attempts,
        AVG(s.score) as avg_score,
        COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as exercises_completed,
        COUNT(DISTINCT ex.id) as total_exercises
    FROM exercises ex
    LEFT JOIN submissions s ON ex.id = s.exercise_id
    LEFT JOIN user_progress up ON ex.id = up.exercise_id AND s.user_id = up.user_id
    GROUP BY ex.course_id, s.user_id
) stats ON e.course_id = stats.course_id AND e.user_id = stats.user_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- 002: Chapters and course details
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE courses ADD COLUMN IF NOT EXISTS long_description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 1;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags VARCHAR(50)[];

CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_exercises_chapter ON exercises(chapter_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 003: Course language
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'javascript';

-- ═══════════════════════════════════════════════════════════════════════════
-- 004: Auth features (email verification, password reset, Google OAuth)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 005: AI hints
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_hints (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    hint_number INTEGER NOT NULL CHECK (hint_number BETWEEN 1 AND 3),
    hint_text TEXT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id, hint_number)
);

CREATE TABLE IF NOT EXISTS ai_complexity_analysis (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    code_snapshot TEXT NOT NULL,
    time_complexity VARCHAR(50),
    space_complexity VARCHAR(50),
    explanation TEXT,
    suggestions TEXT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_hints_user_exercise ON ai_hints(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_ai_complexity_user_exercise ON ai_complexity_analysis(user_id, exercise_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 006: Efficiency requirements
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS requires_efficiency BOOLEAN DEFAULT FALSE;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) DEFAULT 'in_progress';
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS efficiency_star BOOLEAN DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 007a: Notifications
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
    from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE TABLE IF NOT EXISTS help_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_help_requests_student ON help_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_course ON help_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status) WHERE status = 'open';

-- ═══════════════════════════════════════════════════════════════════════════
-- 007b: Plagiarism detection
-- ═══════════════════════════════════════════════════════════════════════════
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

CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_course ON plagiarism_reports(course_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_exercise ON plagiarism_reports(exercise_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_matches_report ON plagiarism_matches(report_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_matches_similarity ON plagiarism_matches(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_plagiarism_notifications_professor ON plagiarism_notifications(professor_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_notifications_unread ON plagiarism_notifications(professor_id, is_read) WHERE is_read = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 008: Enrollment codes
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_code VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_courses_enrollment_code ON courses(enrollment_code) WHERE enrollment_code IS NOT NULL;

-- Note: Unique constraint on enrollment_code — safe to re-run with DO block
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_enrollment_code') THEN
        ALTER TABLE courses ADD CONSTRAINT unique_enrollment_code UNIQUE (enrollment_code);
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 009: Timed exercises
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT NULL;

CREATE TABLE IF NOT EXISTS timed_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    time_expired BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_timed_sessions_user_exercise ON timed_sessions(user_id, exercise_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 010: Multi-file exercises
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_multi_file BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS exercise_files (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    starter_code TEXT DEFAULT '',
    is_entry_point BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exercise_id, filename)
);

CREATE INDEX IF NOT EXISTS idx_exercise_files_exercise ON exercise_files(exercise_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 011: Calendar events (scheduling & calendar integration)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('deadline', 'live_session', 'reminder', 'custom')),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    all_day BOOLEAN DEFAULT FALSE,
    color VARCHAR(20),
    recurrence VARCHAR(30) CHECK (recurrence IN (NULL, 'daily', 'weekly', 'monthly')),
    recurrence_end DATE,
    reminder_minutes INTEGER DEFAULT 30,
    is_public BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_course ON calendar_events(course_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_range ON calendar_events(user_id, start_time, end_time);

-- ═══════════════════════════════════════════════════════════════════════════
-- Done
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'All migrations applied successfully' as status;
