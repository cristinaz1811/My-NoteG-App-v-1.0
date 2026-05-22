-- Docker-compatible schema initialization
-- (The database is already created by POSTGRES_DB env var)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_by INTEGER REFERENCES users(id),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course materials table
CREATE TABLE IF NOT EXISTS course_materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    resource_type VARCHAR(30) NOT NULL CHECK (resource_type IN ('article', 'video', 'reading', 'cheatsheet', 'reference', 'project')),
    resource_url VARCHAR(500),
    order_index INTEGER DEFAULT 0,
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
    user_id INTEGER REFERENCES users(id),
    exercise_id INTEGER REFERENCES exercises(id),
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
    UNIQUE(user_id, course_id)
);

-- User exercise progress
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    exercise_id INTEGER REFERENCES exercises(id),
    completed BOOLEAN DEFAULT FALSE,
    best_score DECIMAL(5,2) DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    UNIQUE(user_id, exercise_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_course ON exercises(course_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_exercise ON test_cases(exercise_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exercise ON submissions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_chapter ON course_materials(chapter_id);
