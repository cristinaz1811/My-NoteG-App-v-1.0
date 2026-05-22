const {
    tokenize,
    compareSubmissions,
    compareAllSubmissions,
    ngramSimilarity,
    lcsSimilarity,
} = require('../utils/plagiarismDetector');

describe('tokenize', () => {
    it('returns an empty array for invalid input', () => {
        expect(tokenize(null)).toEqual([]);
        expect(tokenize(123)).toEqual([]);
        expect(tokenize('')).toEqual([]);
    });

    it('produces an identical token stream for identical code', () => {
        const code = 'function add(a, b) { return a + b; }';
        expect(tokenize(code)).toEqual(tokenize(code));
    });

    it('ignores comments', () => {
        const withComment = tokenize('const x = 1; // a trailing comment');
        const without = tokenize('const x = 1;');
        expect(withComment).toEqual(without);
    });

    it('normalizes identifier names so renamed variables tokenize the same', () => {
        const a = tokenize('function add(a, b) { return a + b; }');
        const b = tokenize('function sum(x, y) { return x + y; }');
        expect(a).toEqual(b);
    });
});

describe('compareSubmissions', () => {
    it('reports 100% similarity for identical code', () => {
        const code = 'function add(a, b) {\n  return a + b;\n}';
        expect(compareSubmissions(code, code).similarity).toBe(100);
    });

    it('reports 100% similarity when only variable names differ', () => {
        const a = 'function add(a, b) { return a + b; }';
        const b = 'function sum(first, second) { return first + second; }';
        expect(compareSubmissions(a, b).similarity).toBe(100);
    });

    it('reports 0 similarity when a submission is too short', () => {
        const result = compareSubmissions('x', 'function f() { return 1; }');
        expect(result.similarity).toBe(0);
        expect(result.fragments).toEqual([]);
    });

    it('reports lower similarity for structurally different code', () => {
        const a = 'function add(a, b) { return a + b; }';
        const b = 'const items = [1, 2, 3];\nitems.forEach(function (n) { console.log(n); });';
        expect(compareSubmissions(a, b).similarity).toBeLessThan(100);
    });
});

describe('ngramSimilarity and lcsSimilarity', () => {
    it('return values within the 0..100 range', () => {
        const a = tokenize('const x = 1; const y = 2;');
        const b = tokenize('const a = 9; const b = 8;');
        for (const score of [ngramSimilarity(a, b), lcsSimilarity(a, b)]) {
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        }
    });

    it('return 100 for identical token streams', () => {
        const tokens = tokenize('function add(a, b) { return a + b; }');
        expect(ngramSimilarity(tokens, tokens)).toBe(100);
        expect(lcsSimilarity(tokens, tokens)).toBe(100);
    });
});

describe('compareAllSubmissions', () => {
    const makeSub = (id, userId, code, submittedAt) => ({
        id,
        user_id: userId,
        code,
        language: 'javascript',
        submitted_at: submittedAt,
    });
    const sharedCode = 'function add(a, b) { return a + b; }';

    it('flags a pair of identical submissions above the threshold', () => {
        const flagged = compareAllSubmissions(
            [
                makeSub(1, 10, sharedCode, '2024-01-01'),
                makeSub(2, 20, sharedCode, '2024-01-01'),
            ],
            70
        );
        expect(flagged).toHaveLength(1);
        expect(flagged[0].similarity).toBeGreaterThanOrEqual(70);
    });

    it('keeps only the latest submission per user before comparing', () => {
        const flagged = compareAllSubmissions(
            [
                makeSub(1, 10, sharedCode, '2024-01-01'),
                makeSub(2, 10, sharedCode, '2024-02-01'),
                makeSub(3, 20, sharedCode, '2024-01-01'),
            ],
            70
        );
        expect(flagged).toHaveLength(1);
    });

    it('returns an empty array when only one user has submitted', () => {
        const flagged = compareAllSubmissions(
            [
                makeSub(1, 10, sharedCode, '2024-01-01'),
                makeSub(2, 10, sharedCode, '2024-02-01'),
            ],
            70
        );
        expect(flagged).toEqual([]);
    });

    it('sorts flagged pairs by descending similarity', () => {
        const flagged = compareAllSubmissions(
            [
                makeSub(1, 10, sharedCode, '2024-01-01'),
                makeSub(2, 20, sharedCode, '2024-01-01'),
                makeSub(3, 30, sharedCode, '2024-01-01'),
            ],
            70
        );
        for (let i = 1; i < flagged.length; i++) {
            expect(flagged[i - 1].similarity).toBeGreaterThanOrEqual(flagged[i].similarity);
        }
    });
});
