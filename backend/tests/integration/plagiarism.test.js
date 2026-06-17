const request = require('supertest');
const { app } = require('../../server');
const { truncateAll, closePool, db } = require('../helpers/db');
const { createUser, createCourse, createExercise, enroll, authHeader } = require('../helpers/factories');

beforeEach(() => truncateAll());
afterAll(() => closePool());

async function passedSubmission(userId, exerciseId, code) {
    await db.query(
        `INSERT INTO submissions (user_id, exercise_id, code, language, status, score, tests_passed, tests_total)
         VALUES ($1, $2, $3, 'javascript', 'passed', 100, 1, 1)`,
        [userId, exerciseId, code]
    );
}

describe('POST /api/plagiarism/scan/:exerciseId', () => {
    it('flags two near-identical submissions from different students', async () => {
        const prof = await createUser({ role: 'professor' });
        const course = await createCourse(prof.id);
        const exercise = await createExercise(course.id);

        const s1 = await createUser({ role: 'student' });
        const s2 = await createUser({ role: 'student' });
        await enroll(s1.id, course.id);
        await enroll(s2.id, course.id);

        const codeA = 'function solve(arr) {\n  let total = 0;\n  for (let i = 0; i < arr.length; i++) total += arr[i];\n  return total;\n}';
        const codeB = 'function solve(values) {\n  let sum = 0;\n  for (let k = 0; k < values.length; k++) sum += values[k];\n  return sum;\n}';
        await passedSubmission(s1.id, exercise.id, codeA);
        await passedSubmission(s2.id, exercise.id, codeB);

        const res = await request(app)
            .post(`/api/plagiarism/scan/${exercise.id}`)
            .set('Authorization', authHeader(prof))
            .send({ threshold: 70 });

        expect(res.status).toBe(200);
        expect(res.body.matches.length).toBeGreaterThanOrEqual(1);
        expect(res.body.matches[0].similarity).toBeGreaterThanOrEqual(70);
    });

    it('returns no matches when there are fewer than two submissions', async () => {
        const prof = await createUser({ role: 'professor' });
        const course = await createCourse(prof.id);
        const exercise = await createExercise(course.id);
        const s1 = await createUser({ role: 'student' });
        await enroll(s1.id, course.id);
        await passedSubmission(s1.id, exercise.id, 'function solve() { return 1; }');

        const res = await request(app)
            .post(`/api/plagiarism/scan/${exercise.id}`)
            .set('Authorization', authHeader(prof))
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.matches).toEqual([]);
    });

    it("forbids a professor who doesn't own the course (403)", async () => {
        const owner = await createUser({ role: 'professor' });
        const course = await createCourse(owner.id);
        const exercise = await createExercise(course.id);
        const stranger = await createUser({ role: 'professor' });

        const res = await request(app)
            .post(`/api/plagiarism/scan/${exercise.id}`)
            .set('Authorization', authHeader(stranger))
            .send({});
        expect(res.status).toBe(403);
    });
});
