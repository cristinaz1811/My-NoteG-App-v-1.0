-- Migration: Add multi-file exercise support
-- Allows exercises to have multiple files (e.g., a class + test file)

-- Flag to indicate an exercise uses multiple files
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_multi_file BOOLEAN DEFAULT FALSE;

-- Table to store individual file templates for multi-file exercises
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
