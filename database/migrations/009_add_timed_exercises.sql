-- Migration: Add timed exercises / quiz mode
-- Adds time_limit_minutes to exercises and tracks timed sessions per user

-- Add time limit to exercises (in minutes, NULL means no time limit)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT NULL;

-- Table to track timed exercise sessions
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
