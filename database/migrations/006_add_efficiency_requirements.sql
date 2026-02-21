-- Migration: Add efficiency requirements to exercises
-- Adds requires_efficiency flag and 3-status completion tracking

-- Exercise-level: professor can mark exercise as requiring efficient solution
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS requires_efficiency BOOLEAN DEFAULT FALSE;

-- User progress: track completion status (in_progress | inefficient | completed)
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) DEFAULT 'in_progress';

-- User progress: star badge for achieving optimal complexity on non-required exercises
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS efficiency_star BOOLEAN DEFAULT FALSE;
