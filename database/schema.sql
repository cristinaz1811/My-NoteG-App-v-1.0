-- Create database
CREATE DATABASE code_learning;

-- Connect to the database
\c code_learning;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises table
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    starter_code TEXT,
    solution_template TEXT,
    language VARCHAR(50) DEFAULT 'javascript',
    time_limit INTEGER DEFAULT 5000, -- milliseconds
    memory_limit INTEGER DEFAULT 256, -- MB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course materials table
CREATE TABLE course_materials (
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
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User submissions table
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    exercise_id INTEGER REFERENCES exercises(id),
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50), -- 'passed', 'failed', 'error', 'timeout'
    score DECIMAL(5,2),
    tests_passed INTEGER DEFAULT 0,
    tests_total INTEGER DEFAULT 0,
    execution_time INTEGER, -- milliseconds
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User course enrollment
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress DECIMAL(5,2) DEFAULT 0,
    UNIQUE(user_id, course_id)
);

-- User exercise progress
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    exercise_id INTEGER REFERENCES exercises(id),
    completed BOOLEAN DEFAULT FALSE,
    best_score DECIMAL(5,2) DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    UNIQUE(user_id, exercise_id)
);

-- Indexes for better performance
CREATE INDEX idx_exercises_course ON exercises(course_id);
CREATE INDEX idx_test_cases_exercise ON test_cases(exercise_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_exercise ON submissions(exercise_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_course_materials_course ON course_materials(course_id);
CREATE INDEX idx_course_materials_chapter ON course_materials(chapter_id);

-- Insert sample data
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@codelearning.com', '$2b$10$YourHashedPasswordHere', 'admin'),
('john_doe', 'john@example.com', '$2b$10$YourHashedPasswordHere', 'student');

INSERT INTO courses (title, description, difficulty, created_by) VALUES
('JavaScript Fundamentals', 'Learn the basics of JavaScript programming', 'beginner', 1),
('Python Data Structures', 'Master data structures using Python', 'intermediate', 1),
('Advanced Algorithms', 'Deep dive into complex algorithms', 'advanced', 1);

INSERT INTO exercises (course_id, title, description, difficulty, starter_code, language) VALUES
(1, 'Two Sum', 'Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.', 'easy', 
'function twoSum(nums, target) {\n    // Write your code here\n}', 'javascript'),
(1, 'Reverse String', 'Write a function that reverses a string.', 'easy',
'function reverseString(s) {\n    // Write your code here\n}', 'javascript'),
(2, 'Valid Parentheses', 'Given a string containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.', 'medium',
'def isValid(s):\n    # Write your code here\n    pass', 'python');

INSERT INTO test_cases (exercise_id, input, expected_output, is_hidden) VALUES
(1, '[[2,7,11,15], 9]', '[0,1]', FALSE),
(1, '[[3,2,4], 6]', '[1,2]', FALSE),
(1, '[[3,3], 6]', '[0,1]', TRUE),
(2, '["hello"]', '"olleh"', FALSE),
(2, '["world"]', '"dlrow"', FALSE),
(2, '["JavaScript"]', '"tpircSavaJ"', TRUE),
(3, '["()"]', 'true', FALSE),
(3, '["()[]{}"]', 'true', FALSE),
(3, '["(]"]', 'false', FALSE),
(3, '["{[]}"]', 'true', TRUE);
