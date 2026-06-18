const { computeMetrics } = require('../../utils/plagiarismMetrics');
const { compareAllSubmissions } = require('../../utils/plagiarismDetector');
const { submissions, groundTruthPairs } = require('../fixtures/plagiarismDataset');

describe('computeMetrics', () => {
    it('computes a confusion matrix and precision/recall/F1', () => {
        const ids = [1, 2, 3];
        // truth: (1,2). predicted: (1,2) correct, (1,3) false positive.
        const m = computeMetrics([[1, 2], [1, 3]], [[1, 2]], ids);
        expect(m).toMatchObject({ tp: 1, fp: 1, fn: 0, tn: 1 });
        expect(m.precision).toBeCloseTo(0.5);
        expect(m.recall).toBe(1);
        expect(m.f1).toBeCloseTo(2 / 3);
    });

    it('is order-insensitive for pairs', () => {
        const m = computeMetrics([[2, 1]], [[1, 2]], [1, 2]);
        expect(m.tp).toBe(1);
    });
});

describe('detector validation on the labeled dataset', () => {
    const ids = submissions.map((s) => s.user_id);
    const flagged = compareAllSubmissions(submissions, 70).map((p) => [
        p.submissionA.user_id,
        p.submissionB.user_id,
    ]);
    const m = computeMetrics(flagged, groundTruthPairs, ids);

    it('catches rename/comment/whitespace plagiarism (high recall)', () => {
        // The detector normalizes identifiers and strips comments, so all
        // same-origin pairs should be flagged.
        expect(m.recall).toBeGreaterThanOrEqual(0.75);
    });

    it('does not flag the independent control solutions (no false positives on controls)', () => {
        // user 6 (string reverse) shares nothing with the others.
        expect(flagged.some(([a, b]) => a === 6 || b === 6)).toBe(false);
    });
});
