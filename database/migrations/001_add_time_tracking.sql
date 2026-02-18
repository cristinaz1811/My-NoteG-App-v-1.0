-- Migration: Add time tracking for courses
-- Run this after the initial schema

-- Add total time spent to enrollments table
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0; -- in seconds

-- Create time tracking sessions table
CREATE TABLE IF NOT EXISTS time_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER, -- in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for time sessions
CREATE INDEX IF NOT EXISTS idx_time_sessions_user ON time_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_course ON time_sessions(course_id);

-- View for course statistics per user
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
