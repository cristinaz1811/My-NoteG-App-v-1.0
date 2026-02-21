const db = require('../config/database');

// XP rewards configuration
const XP_REWARDS = {
    EXERCISE_COMPLETE: 50,          // Base XP for completing an exercise
    DIFFICULTY_BONUS: {             // Extra XP based on exercise difficulty
        easy: 0,
        medium: 25,
        hard: 50,
    },
    PERFECT_SCORE: 30,              // Bonus for 100% on first try
    DAILY_FIRST: 20,                // First exercise of the day
    STREAK_BONUS_PER_DAY: 5,        // Extra XP per streak day (caps at 50)
    COURSE_COMPLETE: 200,           // Completing all exercises in a course
};

// Level thresholds: level N requires this much total XP
const getLevelForXP = (xp) => {
    // Each level requires progressively more XP
    // Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 450, Level 5: 700, ...
    // Formula: XP needed for level N = 50 * N * (N - 1) / 2 + 100 * (N - 1)
    // Simplified: just iterate
    let level = 1;
    let threshold = 0;
    while (true) {
        const nextThreshold = threshold + 100 + (level - 1) * 50;
        if (xp < nextThreshold) break;
        threshold = nextThreshold;
        level++;
    }
    return { level, currentThreshold: threshold, nextThreshold: threshold + 100 + (level - 1) * 50 };
};

/**
 * Initialize XP record for a user if it doesn't exist
 */
const ensureUserXP = async (userId) => {
    const existing = await db.query('SELECT * FROM user_xp WHERE user_id = $1', [userId]);
    if (existing.rows.length === 0) {
        await db.query('INSERT INTO user_xp (user_id) VALUES ($1)', [userId]);
        return { user_id: userId, total_xp: 0, level: 1, current_streak: 0, longest_streak: 0, exercises_completed: 0, perfect_scores: 0 };
    }
    return existing.rows[0];
};

/**
 * Award XP to a user for completing an exercise.
 * Returns: { xpGained, newBadges, levelUp, streakUpdate, userXP }
 */
const awardExerciseXP = async (userId, exerciseId, score, isFirstCompletion) => {
    const result = {
        xpGained: 0,
        xpBreakdown: [],
        newBadges: [],
        levelUp: false,
        oldLevel: 1,
        newLevel: 1,
        streakUpdate: null,
    };

    // Only award XP on first completion (100% score)
    if (!isFirstCompletion || score < 100) {
        // Still return current XP info
        const userXP = await ensureUserXP(userId);
        result.oldLevel = userXP.level;
        result.newLevel = userXP.level;
        result.userXP = userXP;
        return result;
    }

    const userXP = await ensureUserXP(userId);
    result.oldLevel = userXP.level;

    // Get exercise difficulty
    const exerciseResult = await db.query('SELECT difficulty, course_id FROM exercises WHERE id = $1', [exerciseId]);
    const exercise = exerciseResult.rows[0];
    const difficulty = exercise?.difficulty || 'easy';

    // 1. Base XP for completion
    let baseXP = XP_REWARDS.EXERCISE_COMPLETE;
    result.xpBreakdown.push({ reason: 'Exercise completed', amount: baseXP });

    // 2. Difficulty bonus
    const diffBonus = XP_REWARDS.DIFFICULTY_BONUS[difficulty] || 0;
    if (diffBonus > 0) {
        baseXP += diffBonus;
        result.xpBreakdown.push({ reason: `${difficulty} difficulty bonus`, amount: diffBonus });
    }

    // 3. Check if perfect score on first attempt (only 1 attempt total)
    const attemptCheck = await db.query(
        'SELECT attempts FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
        [userId, exerciseId]
    );
    const attempts = attemptCheck.rows[0]?.attempts || 1;
    let isPerfectFirstTry = attempts <= 1 && score === 100;
    if (isPerfectFirstTry) {
        baseXP += XP_REWARDS.PERFECT_SCORE;
        result.xpBreakdown.push({ reason: 'Perfect score on first try!', amount: XP_REWARDS.PERFECT_SCORE });
    }

    // 4. Daily first exercise bonus
    const today = new Date().toISOString().split('T')[0];
    const dailyCheck = await db.query(
        "SELECT id FROM xp_transactions WHERE user_id = $1 AND reason = 'daily_first' AND DATE(created_at) = $2",
        [userId, today]
    );
    if (dailyCheck.rows.length === 0) {
        baseXP += XP_REWARDS.DAILY_FIRST;
        result.xpBreakdown.push({ reason: 'First exercise of the day', amount: XP_REWARDS.DAILY_FIRST });
        await db.query(
            'INSERT INTO xp_transactions (user_id, amount, reason, reference_id) VALUES ($1, $2, $3, $4)',
            [userId, XP_REWARDS.DAILY_FIRST, 'daily_first', exerciseId]
        );
    }

    // 5. Streak bonus
    const streakBonus = Math.min(userXP.current_streak * XP_REWARDS.STREAK_BONUS_PER_DAY, 50);
    if (streakBonus > 0) {
        baseXP += streakBonus;
        result.xpBreakdown.push({ reason: `${userXP.current_streak}-day streak bonus`, amount: streakBonus });
    }

    result.xpGained = baseXP;

    // Record XP transaction
    await db.query(
        'INSERT INTO xp_transactions (user_id, amount, reason, reference_id) VALUES ($1, $2, $3, $4)',
        [userId, baseXP, 'exercise_complete', exerciseId]
    );

    // Update user_xp
    const newTotalXP = userXP.total_xp + baseXP;
    const exercisesCompleted = userXP.exercises_completed + 1;
    const perfectScores = isPerfectFirstTry ? userXP.perfect_scores + 1 : userXP.perfect_scores;

    // Update streak
    const lastActivityDate = userXP.last_activity_date ? new Date(userXP.last_activity_date).toISOString().split('T')[0] : null;
    let newStreak = userXP.current_streak;
    let longestStreak = userXP.longest_streak;

    if (lastActivityDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActivityDate === yesterdayStr) {
            newStreak += 1;
        } else if (lastActivityDate !== today) {
            newStreak = 1; // Reset streak
        }
        longestStreak = Math.max(longestStreak, newStreak);
        result.streakUpdate = { current: newStreak, longest: longestStreak };
    }

    const { level: newLevel } = getLevelForXP(newTotalXP);
    result.newLevel = newLevel;
    result.levelUp = newLevel > result.oldLevel;

    await db.query(
        `UPDATE user_xp SET 
            total_xp = $2, level = $3, current_streak = $4, longest_streak = $5,
            last_activity_date = $6, exercises_completed = $7, perfect_scores = $8,
            updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId, newTotalXP, newLevel, newStreak, longestStreak, today, exercisesCompleted, perfectScores]
    );

    // 6. Check if course is now complete
    if (exercise?.course_id) {
        const courseCompletion = await checkCourseCompletion(userId, exercise.course_id);
        if (courseCompletion.justCompleted) {
            const courseXP = XP_REWARDS.COURSE_COMPLETE;
            result.xpGained += courseXP;
            result.xpBreakdown.push({ reason: 'Course completed!', amount: courseXP });
            await db.query(
                'INSERT INTO xp_transactions (user_id, amount, reason, reference_id) VALUES ($1, $2, $3, $4)',
                [userId, courseXP, 'course_complete', exercise.course_id]
            );
            await db.query(
                'UPDATE user_xp SET total_xp = total_xp + $2 WHERE user_id = $1',
                [userId, courseXP]
            );
        }
    }

    // 7. Check for new badges
    const newBadges = await checkAndAwardBadges(userId);
    result.newBadges = newBadges;

    // Fetch updated XP
    const updatedXP = await db.query('SELECT * FROM user_xp WHERE user_id = $1', [userId]);
    result.userXP = updatedXP.rows[0];

    return result;
};

/**
 * Check if a course was just completed (all exercises done)
 */
const checkCourseCompletion = async (userId, courseId) => {
    const totalExercises = await db.query(
        'SELECT COUNT(*) as count FROM exercises WHERE course_id = $1',
        [courseId]
    );
    const completedExercises = await db.query(
        `SELECT COUNT(*) as count FROM user_progress up
         JOIN exercises e ON up.exercise_id = e.id
         WHERE up.user_id = $1 AND e.course_id = $2 AND up.completed = true`,
        [userId, courseId]
    );

    const total = parseInt(totalExercises.rows[0].count);
    const completed = parseInt(completedExercises.rows[0].count);

    // Check if this exact submission made it complete (completed == total and wasn't complete before)
    if (total > 0 && completed === total) {
        // Check if we already awarded course_complete XP
        const alreadyAwarded = await db.query(
            "SELECT id FROM xp_transactions WHERE user_id = $1 AND reason = 'course_complete' AND reference_id = $2",
            [userId, courseId]
        );
        if (alreadyAwarded.rows.length === 0) {
            return { justCompleted: true };
        }
    }
    return { justCompleted: false };
};

/**
 * Check all badge conditions and award any new badges earned
 */
const checkAndAwardBadges = async (userId) => {
    const userXP = await db.query('SELECT * FROM user_xp WHERE user_id = $1', [userId]);
    if (userXP.rows.length === 0) return [];

    const xpData = userXP.rows[0];
    const newBadges = [];

    // Get all badges not yet earned by this user
    const unearnedBadges = await db.query(
        `SELECT b.* FROM badges b 
         WHERE b.id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = $1)`,
        [userId]
    );

    // Count completed courses
    const completedCourses = await db.query(
        `SELECT COUNT(DISTINCT e.course_id) as count
         FROM user_progress up
         JOIN exercises e ON up.exercise_id = e.id
         WHERE up.user_id = $1 AND up.completed = true
         AND NOT EXISTS (
             SELECT 1 FROM exercises e2 
             WHERE e2.course_id = e.course_id 
             AND e2.id NOT IN (SELECT exercise_id FROM user_progress WHERE user_id = $1 AND completed = true)
         )`,
        [userId]
    );
    const coursesCompleted = parseInt(completedCourses.rows[0]?.count || 0);

    for (const badge of unearnedBadges.rows) {
        let earned = false;

        switch (badge.requirement_type) {
            case 'exercises_completed':
                earned = xpData.exercises_completed >= badge.requirement_value;
                break;
            case 'perfect_scores':
                earned = xpData.perfect_scores >= badge.requirement_value;
                break;
            case 'streak_days':
                earned = xpData.current_streak >= badge.requirement_value || xpData.longest_streak >= badge.requirement_value;
                break;
            case 'courses_completed':
                earned = coursesCompleted >= badge.requirement_value;
                break;
            case 'xp_total':
                earned = xpData.total_xp >= badge.requirement_value;
                break;
        }

        if (earned) {
            await db.query(
                'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [userId, badge.id]
            );

            // Award badge XP reward
            if (badge.xp_reward > 0) {
                await db.query(
                    'INSERT INTO xp_transactions (user_id, amount, reason, reference_id) VALUES ($1, $2, $3, $4)',
                    [userId, badge.xp_reward, 'badge_earned', badge.id]
                );
                await db.query(
                    'UPDATE user_xp SET total_xp = total_xp + $2 WHERE user_id = $1',
                    [userId, badge.xp_reward]
                );
            }

            newBadges.push({
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                category: badge.category,
                xp_reward: badge.xp_reward,
            });
        }
    }

    return newBadges;
};

/**
 * Get user's gamification profile
 */
const getUserGamificationProfile = async (userId) => {
    const userXP = await ensureUserXP(userId);
    const { level, currentThreshold, nextThreshold } = getLevelForXP(userXP.total_xp);

    const badges = await db.query(
        `SELECT b.*, ub.earned_at 
         FROM user_badges ub 
         JOIN badges b ON ub.badge_id = b.id 
         WHERE ub.user_id = $1 
         ORDER BY ub.earned_at DESC`,
        [userId]
    );

    const recentXP = await db.query(
        `SELECT * FROM xp_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
    );

    return {
        xp: {
            total: userXP.total_xp,
            level,
            xpInCurrentLevel: userXP.total_xp - currentThreshold,
            xpNeededForNextLevel: nextThreshold - currentThreshold,
            progressPercent: Math.round(((userXP.total_xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100),
        },
        streak: {
            current: userXP.current_streak,
            longest: userXP.longest_streak,
            lastActivity: userXP.last_activity_date,
        },
        stats: {
            exercisesCompleted: userXP.exercises_completed,
            perfectScores: userXP.perfect_scores,
        },
        badges: badges.rows,
        recentXP: recentXP.rows,
    };
};

module.exports = {
    awardExerciseXP,
    getUserGamificationProfile,
    ensureUserXP,
    getLevelForXP,
    XP_REWARDS,
};
