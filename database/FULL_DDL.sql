-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE DATABASE DDL SCRIPT
-- PostgreSQL 15
-- Generated: 2026-06-05
-- ═══════════════════════════════════════════════════════════════════════════
-- This script contains all tables, indexes, views, constraints, and roles
-- for the NoteG code learning platform
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'student',
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    long_description TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_by INTEGER REFERENCES users(id),
    language VARCHAR(50) DEFAULT 'javascript',
    estimated_hours INTEGER DEFAULT 1,
    image_url VARCHAR(500),
    tags VARCHAR(50)[],
    learning_objectives TEXT[],
    prerequisites TEXT[],
    is_private BOOLEAN DEFAULT FALSE,
    enrollment_code VARCHAR(20),
    class_id INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    starter_code TEXT,
    solution_template TEXT,
    language VARCHAR(50) DEFAULT 'javascript',
    time_limit INTEGER DEFAULT 5000,
    memory_limit INTEGER DEFAULT 256,
    chapter_id INTEGER,
    order_index INTEGER DEFAULT 0,
    requires_efficiency BOOLEAN DEFAULT FALSE,
    time_limit_minutes INTEGER DEFAULT NULL,
    is_multi_file BOOLEAN DEFAULT FALSE,
    exercise_type VARCHAR(20) NOT NULL DEFAULT 'code' CHECK (exercise_type IN ('code', 'sql')),
    seed_sql TEXT,
    validation_query TEXT,
    expected_result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50),
    score DECIMAL(5,2),
    tests_passed INTEGER DEFAULT 0,
    tests_total INTEGER DEFAULT 0,
    execution_time INTEGER,
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User course enrollment
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress DECIMAL(5,2) DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    UNIQUE(user_id, course_id)
);

-- User exercise progress
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    best_score DECIMAL(5,2) DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    completion_status VARCHAR(20) DEFAULT 'in_progress',
    efficiency_star BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, exercise_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- COURSE STRUCTURE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- College Years table
CREATE TABLE IF NOT EXISTS college_years (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    faculty VARCHAR(200),
    school_year VARCHAR(20),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    year_id INTEGER REFERENCES college_years(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    access_key VARCHAR(20) UNIQUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Class Enrollments table
CREATE TABLE IF NOT EXISTS class_enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    enrolled_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, class_id)
);

-- Lectures table
CREATE TABLE IF NOT EXISTS lectures (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lecture Pages table
CREATE TABLE IF NOT EXISTS lecture_pages (
    id SERIAL PRIMARY KEY,
    lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    title VARCHAR(300),
    content TEXT NOT NULL DEFAULT '',
    page_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Lecture Media table
CREATE TABLE IF NOT EXISTS lecture_media (
    id SERIAL PRIMARY KEY,
    lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('video', 'powerpoint', 'pdf')),
    title VARCHAR(300) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    duration_seconds INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lecture Progress table
CREATE TABLE IF NOT EXISTS lecture_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    last_page_seen INTEGER NOT NULL DEFAULT 1,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    UNIQUE(user_id, lecture_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- TIME TRACKING TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Course Time Sessions table
CREATE TABLE IF NOT EXISTS course_time_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- AI FEATURES TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- AI Hints table
CREATE TABLE IF NOT EXISTS ai_hints (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    hint_number INTEGER NOT NULL CHECK (hint_number BETWEEN 1 AND 3),
    hint_text TEXT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id, hint_number)
);

-- AI Complexity Analysis table
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

-- ═══════════════════════════════════════════════════════════════════════════
-- MULTI-FILE EXERCISES TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Exercise Files table
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

-- ═══════════════════════════════════════════════════════════════════════════
-- TIMED EXERCISES TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Exam Sessions table
CREATE TABLE IF NOT EXISTS exam_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    time_expired BOOLEAN DEFAULT FALSE,
    tab_switches INTEGER DEFAULT 0,
    last_violation_at TIMESTAMP,
    locked_by_flag BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP,
    unlocked_by INTEGER REFERENCES users(id),
    unlocked_at TIMESTAMP,
    UNIQUE(user_id, exercise_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SQL EXERCISES TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- SQL Sessions table
CREATE TABLE IF NOT EXISTS sql_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    schema_name VARCHAR(100) NOT NULL UNIQUE,
    last_query TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, exercise_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS AND HELP TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Notifications table
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
    report_id INTEGER REFERENCES plagiarism_reports(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Help Requests table
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

-- ═══════════════════════════════════════════════════════════════════════════
-- PLAGIARISM DETECTION TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Plagiarism Reports table
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

-- Plagiarism Matches table
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

-- ═══════════════════════════════════════════════════════════════════════════
-- CALENDAR EVENTS TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Calendar Events table
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

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_courses_enrollment_code ON courses(enrollment_code) WHERE enrollment_code IS NOT NULL;

-- Exercise indexes
CREATE INDEX IF NOT EXISTS idx_exercises_course ON exercises(course_id);
CREATE INDEX IF NOT EXISTS idx_exercises_chapter ON exercises(chapter_id);

-- Test case indexes
CREATE INDEX IF NOT EXISTS idx_test_cases_exercise ON test_cases(exercise_id);

-- Submission indexes
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exercise ON submissions(exercise_id);

-- Enrollment indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);

-- Chapter indexes
CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);

-- Course time session indexes
CREATE INDEX IF NOT EXISTS idx_course_time_sessions_user ON course_time_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_course_time_sessions_course ON course_time_sessions(course_id);

-- AI hints indexes
CREATE INDEX IF NOT EXISTS idx_ai_hints_user_exercise ON ai_hints(user_id, exercise_id);

-- AI complexity analysis indexes
CREATE INDEX IF NOT EXISTS idx_ai_complexity_user_exercise ON ai_complexity_analysis(user_id, exercise_id);

-- Exercise files indexes
CREATE INDEX IF NOT EXISTS idx_exercise_files_exercise ON exercise_files(exercise_id);

-- Exam sessions indexes
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_exercise ON exam_sessions(user_id, exercise_id);

-- SQL sessions indexes
CREATE INDEX IF NOT EXISTS idx_sql_sessions_user ON sql_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sql_sessions_active ON sql_sessions(last_active_at);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Help request indexes
CREATE INDEX IF NOT EXISTS idx_help_requests_student ON help_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_course ON help_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status) WHERE status = 'open';

-- Plagiarism indexes
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_course ON plagiarism_reports(course_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_exercise ON plagiarism_reports(exercise_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_matches_report ON plagiarism_matches(report_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_matches_similarity ON plagiarism_matches(similarity_score DESC);

-- Calendar event indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_course ON calendar_events(course_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_range ON calendar_events(user_id, start_time, end_time);

-- Class enrollment indexes
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user ON class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- UNIQUE CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE courses ADD CONSTRAINT IF NOT EXISTS unique_enrollment_code UNIQUE (enrollment_code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_college_years_faculty_name_sy
    ON college_years (faculty, name, school_year)
    WHERE faculty IS NOT NULL AND school_year IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- User Course Statistics View
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
-- ROLES
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sql_sandbox') THEN
        CREATE ROLE sql_sandbox NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF DDL SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════
