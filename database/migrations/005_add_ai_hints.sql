-- Migration: Add AI hints tracking
-- Tracks unlocked hints per user per exercise and caches AI responses

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
