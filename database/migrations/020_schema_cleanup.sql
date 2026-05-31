-- ═══════════════════════════════════════════════════════════════════════════
-- 020: Schema cleanup
--   1. Drop unused course_materials table
--   2. Add report_id to notifications; migrate plagiarism_notifications into it
--   3. Rename time_sessions → course_time_sessions
--   4. Rename timed_sessions → exam_sessions
--   5. Add missing ON DELETE CASCADE on submissions and user_progress
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Drop course_materials (never used; replaced by lectures system) ────────
DROP TABLE IF EXISTS course_materials;

-- ── 2. Merge plagiarism_notifications into notifications ──────────────────────
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS report_id INTEGER REFERENCES plagiarism_reports(id) ON DELETE CASCADE;

INSERT INTO notifications (user_id, type, title, message, course_id, exercise_id, report_id, is_read, created_at)
SELECT
    professor_id,
    'plagiarism_alert',
    'Plagiarism Alert',
    message,
    course_id,
    exercise_id,
    report_id,
    is_read,
    created_at
FROM plagiarism_notifications;

DROP TABLE IF EXISTS plagiarism_notifications;

-- ── 3. Rename time_sessions → course_time_sessions ───────────────────────────
ALTER TABLE time_sessions RENAME TO course_time_sessions;

ALTER INDEX IF EXISTS idx_time_sessions_user    RENAME TO idx_course_time_sessions_user;
ALTER INDEX IF EXISTS idx_time_sessions_course  RENAME TO idx_course_time_sessions_course;

-- ── 4. Rename timed_sessions → exam_sessions ─────────────────────────────────
ALTER TABLE timed_sessions RENAME TO exam_sessions;

ALTER INDEX IF EXISTS idx_timed_sessions_user_exercise RENAME TO idx_exam_sessions_user_exercise;

-- ── 5. Add missing ON DELETE CASCADE ─────────────────────────────────────────

-- submissions: cascade when a user or exercise is deleted
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_exercise_id_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

-- user_progress: cascade when a user or exercise is deleted
ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;
ALTER TABLE user_progress ADD CONSTRAINT user_progress_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_exercise_id_fkey;
ALTER TABLE user_progress ADD CONSTRAINT user_progress_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

-- help_requests: cascade when a student account is deleted
ALTER TABLE help_requests DROP CONSTRAINT IF EXISTS help_requests_student_id_fkey;
ALTER TABLE help_requests ADD CONSTRAINT help_requests_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
