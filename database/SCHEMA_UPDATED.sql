-- ═══════════════════════════════════════════════════════════════════════════
-- Code Learning Platform - Database Schema (DDL)
-- Last Updated: June 6, 2026
-- Database: code_learning
-- ═══════════════════════════════════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════════════════════════
-- A. USER MANAGEMENT
-- ═════════════════════════════════════════════════════════════════════════════

-- A.1 Faculties: Academic departments with email domain mapping
CREATE TABLE faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email_domain VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A.2 Users: All platform users (students and professors)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'professor')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    google_id VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    faculty_id INTEGER REFERENCES faculties(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_faculty_id ON users(faculty_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- B. COURSE STRUCTURE & ORGANIZATION
-- ═════════════════════════════════════════════════════════════════════════════

-- B.1 Courses: Main teaching units
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    long_description TEXT,
    difficulty VARCHAR(50),
    language VARCHAR(50) DEFAULT 'javascript',
    estimated_hours INTEGER DEFAULT 1,
    image_url VARCHAR(500),
    tags VARCHAR(50)[],
    learning_objectives TEXT[],
    prerequisites TEXT[],
    is_private BOOLEAN DEFAULT false,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enrollment_code VARCHAR(50) UNIQUE,
    class_id INTEGER,
    order_index INTEGER DEFAULT 0,
    -- AI Configuration
    ai_hints_enabled BOOLEAN DEFAULT true,
    ai_hint_guidance TEXT,
    ai_hint_mode VARCHAR(50),
    custom_hint_levels JSONB
);

CREATE INDEX idx_courses_created_by ON courses(created_by);
CREATE INDEX idx_courses_class_id ON courses(class_id);
CREATE INDEX idx_courses_enrollment_code ON courses(enrollment_code);

-- B.2 Chapters: Course structure - group lectures and exercises
CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chapters_course_id ON chapters(course_id);

-- B.3 Enrollments: Students enrolled in courses
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress NUMERIC DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- C. LECTURE SYSTEM
-- ═════════════════════════════════════════════════════════════════════════════

-- C.1 Lectures: Course lectures
CREATE TABLE lectures (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lectures_course_id ON lectures(course_id);
CREATE INDEX idx_lectures_chapter_id ON lectures(chapter_id);

-- C.2 Lecture Pages: Multi-page lecture content
CREATE TABLE lecture_pages (
    id SERIAL PRIMARY KEY,
    lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL DEFAULT '',
    page_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_lecture_pages_lecture_id ON lecture_pages(lecture_id);

-- C.3 Lecture Media: Embedded media (images, videos, etc.)
CREATE TABLE lecture_media (
    id SERIAL PRIMARY KEY,
    lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    duration_seconds INTEGER,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_lecture_media_lecture_id ON lecture_media(lecture_id);

-- C.4 Lecture Progress: Track student progress through lectures
CREATE TABLE lecture_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    last_page_seen INTEGER DEFAULT 1,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    UNIQUE(user_id, lecture_id)
);

CREATE INDEX idx_lecture_progress_user_id ON lecture_progress(user_id);
CREATE INDEX idx_lecture_progress_lecture_id ON lecture_progress(lecture_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- D. EXERCISE SYSTEM
-- ═════════════════════════════════════════════════════════════════════════════

-- D.1 Exercises: Programming exercises (code, SQL, optimization)
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(50),
    starter_code TEXT,
    solution_template TEXT,
    language VARCHAR(50) DEFAULT 'javascript',
    exercise_type VARCHAR(50) DEFAULT 'code' CHECK (exercise_type IN ('code', 'sql', 'optimization')),
    order_index INTEGER DEFAULT 0,
    requires_efficiency BOOLEAN DEFAULT false,
    time_limit INTEGER DEFAULT 5000,
    memory_limit INTEGER DEFAULT 256,
    time_limit_minutes INTEGER,
    is_multi_file BOOLEAN DEFAULT false,
    seed_sql TEXT,
    validation_query TEXT,
    expected_result JSONB,
    ai_hints_enabled BOOLEAN DEFAULT true,
    custom_hint_levels JSONB,
    is_test BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    available_from TIMESTAMP,
    available_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exercises_course_id ON exercises(course_id);
CREATE INDEX idx_exercises_chapter_id ON exercises(chapter_id);

-- D.2 Exercise Files: Support for multi-file exercises
CREATE TABLE exercise_files (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    starter_code TEXT DEFAULT '',
    is_entry_point BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exercise_files_exercise_id ON exercise_files(exercise_id);

-- D.3 Test Cases: Test cases for exercises
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT false,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_cases_exercise_id ON test_cases(exercise_id);

-- D.4 Submissions: Student code submissions
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50),
    score NUMERIC,
    tests_passed INTEGER DEFAULT 0,
    tests_total INTEGER DEFAULT 0,
    execution_time INTEGER,
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_exercise_id ON submissions(exercise_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- D.5 User Progress: Track exercise completion
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    best_score NUMERIC DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    completion_status VARCHAR(50) DEFAULT 'in_progress',
    efficiency_star BOOLEAN DEFAULT false,
    UNIQUE(user_id, exercise_id)
);

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_exercise_id ON user_progress(exercise_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- E. AI FEATURES
-- ═════════════════════════════════════════════════════════════════════════════

-- E.1 AI Hints: Generated hints for exercises
CREATE TABLE ai_hints (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    hint_number INTEGER NOT NULL,
    hint_text TEXT NOT NULL,
    hint_mode VARCHAR(50) DEFAULT 'solving',
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_hints_user_id ON ai_hints(user_id);
CREATE INDEX idx_ai_hints_exercise_id ON ai_hints(exercise_id);

-- E.2 AI Complexity Analysis: Code complexity analysis
CREATE TABLE ai_complexity_analysis (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    code_snapshot TEXT NOT NULL,
    time_complexity VARCHAR(255),
    space_complexity VARCHAR(255),
    explanation TEXT,
    suggestions TEXT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_complexity_user_id ON ai_complexity_analysis(user_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- F. EXAM SECURITY & SESSION MANAGEMENT
-- ═════════════════════════════════════════════════════════════════════════════

-- F.1 Exam Sessions: Timed exercises with focus monitoring
CREATE TABLE exam_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    time_expired BOOLEAN DEFAULT false,
    tab_switches INTEGER DEFAULT 0,
    last_violation_at TIMESTAMP,
    locked_by_flag BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    unlocked_by INTEGER REFERENCES users(id),
    unlocked_at TIMESTAMP
);

CREATE INDEX idx_exam_sessions_user_id ON exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_exercise_id ON exam_sessions(exercise_id);

-- F.2 Course Time Sessions: Track study time per course
CREATE TABLE course_time_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_course_time_sessions_user_id ON course_time_sessions(user_id);
CREATE INDEX idx_course_time_sessions_course_id ON course_time_sessions(course_id);

-- F.3 SQL Sessions: Database session management for SQL exercises
CREATE TABLE sql_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    schema_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    last_active_at TIMESTAMP DEFAULT now(),
    last_query TEXT
);

CREATE INDEX idx_sql_sessions_user_id ON sql_sessions(user_id);
CREATE INDEX idx_sql_sessions_exercise_id ON sql_sessions(exercise_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- G. PLAGIARISM DETECTION
-- ═════════════════════════════════════════════════════════════════════════════

-- G.1 Plagiarism Reports: Scan reports for exercises
CREATE TABLE plagiarism_reports (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    initiated_by INTEGER NOT NULL REFERENCES users(id),
    total_submissions_compared INTEGER DEFAULT 0,
    flagged_pairs INTEGER DEFAULT 0,
    max_similarity NUMERIC DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_plagiarism_reports_course_id ON plagiarism_reports(course_id);
CREATE INDEX idx_plagiarism_reports_exercise_id ON plagiarism_reports(exercise_id);

-- G.2 Plagiarism Matches: Individual similarity matches
CREATE TABLE plagiarism_matches (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES plagiarism_reports(id) ON DELETE CASCADE,
    submission_a_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    submission_b_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    similarity_score NUMERIC NOT NULL,
    matching_tokens INTEGER DEFAULT 0,
    total_tokens_a INTEGER DEFAULT 0,
    total_tokens_b INTEGER DEFAULT 0,
    matching_fragments JSONB DEFAULT '[]'::jsonb,
    reviewed BOOLEAN DEFAULT false,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_verdict VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plagiarism_matches_report_id ON plagiarism_matches(report_id);
CREATE INDEX idx_plagiarism_matches_user_a ON plagiarism_matches(user_a_id);
CREATE INDEX idx_plagiarism_matches_user_b ON plagiarism_matches(user_b_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- H. CLASS MANAGEMENT
-- ═════════════════════════════════════════════════════════════════════════════

-- H.1 College Years: Academic years/terms
CREATE TABLE college_years (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    faculty VARCHAR(255),
    school_year VARCHAR(50),
    start_date DATE,
    active_until DATE,
    status VARCHAR(50) DEFAULT 'active',
    order_index INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_college_years_created_by ON college_years(created_by);

-- H.2 Classes: Class sections within a year
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    year_id INTEGER NOT NULL REFERENCES college_years(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    access_key VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_classes_year_id ON classes(year_id);
CREATE INDEX idx_classes_created_by ON classes(created_by);

-- H.3 Class Enrollments: Student enrollment in classes
CREATE TABLE class_enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    enrolled_at TIMESTAMP DEFAULT now(),
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, class_id)
);

CREATE INDEX idx_class_enrollments_user_id ON class_enrollments(user_id);
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- I. FEEDBACK & COMMUNICATION
-- ═════════════════════════════════════════════════════════════════════════════

-- I.1 Student Feedback: Professor feedback to students
CREATE TABLE student_feedback (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    professor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    feedback_category VARCHAR(50) DEFAULT 'general',
    is_positive BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_feedback_student_id ON student_feedback(student_id);
CREATE INDEX idx_student_feedback_course_id ON student_feedback(course_id);
CREATE INDEX idx_student_feedback_professor_id ON student_feedback(professor_id);

-- I.2 Help Requests: Student help requests on exercises
CREATE TABLE help_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_help_requests_student_id ON help_requests(student_id);
CREATE INDEX idx_help_requests_exercise_id ON help_requests(exercise_id);

-- I.3 Notifications: System notifications for users
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    course_id INTEGER REFERENCES courses(id),
    exercise_id INTEGER REFERENCES exercises(id),
    from_user_id INTEGER REFERENCES users(id),
    report_id INTEGER REFERENCES plagiarism_reports(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ═════════════════════════════════════════════════════════════════════════════
-- J. CALENDAR & SCHEDULING
-- ═════════════════════════════════════════════════════════════════════════════

-- J.1 Calendar Events: Student calendar for deadlines and events
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    all_day BOOLEAN DEFAULT false,
    color VARCHAR(50),
    recurrence VARCHAR(50),
    recurrence_end DATE,
    reminder_minutes INTEGER DEFAULT 30,
    is_public BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_course_id ON calendar_events(course_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- DATABASE STATISTICS
-- ═════════════════════════════════════════════════════════════════════════════
-- Total Tables: 28
-- Total Indexes: 60+
--
-- Key Statistics:
-- - Users: ~5,000-10,000 records (students + professors)
-- - Courses: ~50-100 records
-- - Exercises: ~200-500 records
-- - Submissions: ~50,000-500,000 records (largest table)
-- - Lectures: ~500-1,000 records
-- - Enrollments: ~5,000-50,000 records
-- - User Progress: ~10,000-50,000 records
--
-- ═════════════════════════════════════════════════════════════════════════════
