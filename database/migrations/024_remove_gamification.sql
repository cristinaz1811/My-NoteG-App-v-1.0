-- ═══════════════════════════════════════════════════════════════════════════
-- 024: Remove Gamification Features
--   Drop all gamification-related tables:
--   - user_xp (user experience points)
--   - xp_transactions (XP history)
--   - badges (achievement badges)
--   - user_badges (user's earned badges)
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS xp_transactions CASCADE;
DROP TABLE IF EXISTS user_xp CASCADE;
