-- Migration: Add enrollment codes and course privacy
-- Allows professors to make courses private with an enrollment code

-- Add privacy and enrollment code columns to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_code VARCHAR(20);

-- Create index for enrollment code lookups
CREATE INDEX IF NOT EXISTS idx_courses_enrollment_code ON courses(enrollment_code) WHERE enrollment_code IS NOT NULL;

-- Add a unique constraint so enrollment codes are unique across courses
ALTER TABLE courses ADD CONSTRAINT unique_enrollment_code UNIQUE (enrollment_code);
