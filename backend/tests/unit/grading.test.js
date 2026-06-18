const {
    calculateScore,
    computeCompletionStatus,
    hintsUnlocked,
    attemptsUntilNextHint,
} = require('../../utils/grading');

describe('calculateScore', () => {
    it('gives 100% when all tests pass and efficiency is not required', () => {
        expect(calculateScore({ allPassed: true, requiresEfficiency: false, testsPassed: 5, testsTotal: 5 })).toBe(100);
    });

    it('gives 80% when all tests pass but efficiency is required', () => {
        expect(calculateScore({ allPassed: true, requiresEfficiency: true, testsPassed: 5, testsTotal: 5 })).toBe(80);
    });

    it('is proportional to passed tests when not all pass', () => {
        expect(calculateScore({ allPassed: false, requiresEfficiency: false, testsPassed: 3, testsTotal: 4 })).toBe(75);
    });

    it('returns 0 when there are no tests', () => {
        expect(calculateScore({ allPassed: false, requiresEfficiency: false, testsPassed: 0, testsTotal: 0 })).toBe(0);
    });
});

describe('computeCompletionStatus', () => {
    it("is 'in_progress' when not all tests pass", () => {
        expect(computeCompletionStatus({ allPassed: false, requiresEfficiency: false })).toBe('in_progress');
    });

    it("is 'completed' when all pass and no efficiency requirement", () => {
        expect(computeCompletionStatus({ allPassed: true, requiresEfficiency: false })).toBe('completed');
    });

    it("is 'inefficient' when all pass but efficiency is required", () => {
        expect(computeCompletionStatus({ allPassed: true, requiresEfficiency: true })).toBe('inefficient');
    });
});

describe('hintsUnlocked', () => {
    it('unlocks one hint per two failed attempts, capped at 3', () => {
        expect(hintsUnlocked(0)).toBe(0);
        expect(hintsUnlocked(1)).toBe(0);
        expect(hintsUnlocked(2)).toBe(1);
        expect(hintsUnlocked(4)).toBe(2);
        expect(hintsUnlocked(6)).toBe(3);
        expect(hintsUnlocked(100)).toBe(3);
    });

    it('treats invalid input as zero', () => {
        expect(hintsUnlocked(undefined)).toBe(0);
        expect(hintsUnlocked(-5)).toBe(0);
    });
});

describe('attemptsUntilNextHint', () => {
    it('counts down failed attempts to the next unlock', () => {
        expect(attemptsUntilNextHint(0)).toBe(2);
        expect(attemptsUntilNextHint(1)).toBe(1);
        expect(attemptsUntilNextHint(2)).toBe(2); // next hint is the 2nd, at 4 attempts
        expect(attemptsUntilNextHint(3)).toBe(1);
    });

    it('is 0 once all three hints are unlocked', () => {
        expect(attemptsUntilNextHint(6)).toBe(0);
        expect(attemptsUntilNextHint(10)).toBe(0);
    });
});
