const { generateEnrollmentCode } = require('../../controllers/courseController');

describe('generateEnrollmentCode', () => {
    it('produces a 6-character uppercase hex code', () => {
        for (let i = 0; i < 50; i++) {
            const code = generateEnrollmentCode();
            expect(code).toMatch(/^[0-9A-F]{6}$/);
        }
    });

    it('is highly unlikely to collide across many calls', () => {
        const codes = new Set();
        for (let i = 0; i < 1000; i++) codes.add(generateEnrollmentCode());
        // 16^6 ≈ 16.7M space; 1000 codes should essentially never collide.
        expect(codes.size).toBeGreaterThan(995);
    });
});
