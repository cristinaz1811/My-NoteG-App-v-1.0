/**
 * Pure grading / progress logic, extracted from exerciseController so it can be
 * unit-tested in isolation. No I/O, no DB — given inputs, returns outputs.
 */

/**
 * Score for a submission.
 *  - requires_efficiency + all tests pass → 80 (upgraded to 100 after complexity analysis)
 *  - otherwise → proportion of tests passed × 100
 */
function calculateScore({ allPassed, requiresEfficiency, testsPassed, testsTotal }) {
    if (allPassed && requiresEfficiency) return 80;
    if (!testsTotal) return 0;
    return (testsPassed / testsTotal) * 100;
}

/**
 * Completion status for user_progress on a (first) attempt.
 *  - not all passed → 'in_progress'
 *  - all passed, efficiency required → 'inefficient' (until complexity is optimal)
 *  - all passed, no efficiency requirement → 'completed'
 */
function computeCompletionStatus({ allPassed, requiresEfficiency }) {
    if (!allPassed) return 'in_progress';
    return requiresEfficiency ? 'inefficient' : 'completed';
}

/**
 * Number of AI hints unlocked: one every 2 failed attempts, capped at 3.
 */
function hintsUnlocked(failedAttempts) {
    const n = Number.isFinite(failedAttempts) ? failedAttempts : 0;
    return Math.min(3, Math.floor(Math.max(0, n) / 2));
}

/**
 * Failed attempts left until the next hint unlocks (0 once all 3 are unlocked).
 */
function attemptsUntilNextHint(failedAttempts) {
    const unlocked = hintsUnlocked(failedAttempts);
    if (unlocked >= 3) return 0;
    return (unlocked + 1) * 2 - failedAttempts;
}

module.exports = {
    calculateScore,
    computeCompletionStatus,
    hintsUnlocked,
    attemptsUntilNextHint,
};
