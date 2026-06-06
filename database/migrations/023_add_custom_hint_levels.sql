-- Add custom hint levels to courses and exercises tables for flexible hint guidance

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS custom_hint_levels JSONB DEFAULT NULL;

ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS custom_hint_levels JSONB DEFAULT NULL;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_courses_custom_hint_levels ON courses(id) WHERE custom_hint_levels IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_custom_hint_levels ON exercises(id) WHERE custom_hint_levels IS NOT NULL;
