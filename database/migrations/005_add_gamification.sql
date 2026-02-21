-- Migration: Add gamification features (XP, levels, badges, streaks, leaderboard)

-- User XP and level tracking
CREATE TABLE IF NOT EXISTS user_xp (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    exercises_completed INTEGER DEFAULT 0,
    perfect_scores INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- XP transaction log (audit trail of all XP earned)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    -- e.g. 'exercise_complete', 'first_try_perfect', 'streak_bonus', 'course_complete', 'daily_first'
    reference_id INTEGER, -- exercise_id or course_id depending on reason
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Badge definitions
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL, -- emoji
    category VARCHAR(50) NOT NULL, -- 'exercises', 'streaks', 'courses', 'special'
    requirement_type VARCHAR(50) NOT NULL,
    -- e.g. 'exercises_completed', 'perfect_scores', 'streak_days', 'courses_completed', 'xp_total', 'first_exercise'
    requirement_value INTEGER NOT NULL DEFAULT 1,
    xp_reward INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User earned badges
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_xp_user ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_total ON user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_level ON user_xp(level DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- Seed badge definitions
INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value, xp_reward) VALUES
-- Exercise milestones
('First Steps', 'Complete your first exercise', '🎯', 'exercises', 'exercises_completed', 1, 50),
('Getting Started', 'Complete 5 exercises', '🔥', 'exercises', 'exercises_completed', 5, 100),
('Problem Solver', 'Complete 10 exercises', '🧩', 'exercises', 'exercises_completed', 10, 200),
('Code Warrior', 'Complete 25 exercises', '⚔️', 'exercises', 'exercises_completed', 25, 500),
('Algorithm Master', 'Complete 50 exercises', '🏆', 'exercises', 'exercises_completed', 50, 1000),
('Coding Legend', 'Complete 100 exercises', '👑', 'exercises', 'exercises_completed', 100, 2000),

-- Perfect score milestones
('Sharp Shooter', 'Get a perfect score on your first try', '🎯', 'special', 'perfect_scores', 1, 75),
('Perfectionist', 'Get 5 perfect scores on first try', '💎', 'special', 'perfect_scores', 5, 200),
('Flawless', 'Get 10 perfect scores on first try', '✨', 'special', 'perfect_scores', 10, 500),
('Untouchable', 'Get 25 perfect scores on first try', '🌟', 'special', 'perfect_scores', 25, 1000),

-- Streak milestones
('Consistent', '3-day coding streak', '📅', 'streaks', 'streak_days', 3, 100),
('Dedicated', '7-day coding streak', '🔥', 'streaks', 'streak_days', 7, 250),
('Unstoppable', '14-day coding streak', '💪', 'streaks', 'streak_days', 14, 500),
('Marathon Coder', '30-day coding streak', '🏃', 'streaks', 'streak_days', 30, 1000),

-- Course milestones
('Course Graduate', 'Complete your first course', '🎓', 'courses', 'courses_completed', 1, 300),
('Multi-Disciplinary', 'Complete 3 courses', '📚', 'courses', 'courses_completed', 3, 750),
('Scholar', 'Complete 5 courses', '🎖️', 'courses', 'courses_completed', 5, 1500),

-- XP milestones
('Rising Star', 'Earn 500 XP', '⭐', 'special', 'xp_total', 500, 0),
('Experienced', 'Earn 2000 XP', '🌟', 'special', 'xp_total', 2000, 0),
('Veteran', 'Earn 5000 XP', '💫', 'special', 'xp_total', 5000, 0),
('Elite', 'Earn 10000 XP', '🏅', 'special', 'xp_total', 10000, 0)
ON CONFLICT (name) DO NOTHING;
