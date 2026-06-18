const request = require('supertest');
const { app } = require('../../server');
const { truncateAll, closePool, db } = require('../helpers/db');
const { createUser, createCourse, createExercise, enroll, authHeader } = require('../helpers/factories');

beforeEach(() => truncateAll());
afterAll(() => closePool());

async function seedSumExercise() {
    const prof = await createUser({ role: 'professor' });
    const course = await createCourse(prof.id);
    const exercise = await createExercise(course.id, {
        title: 'Add two numbers',
        language: 'javascript',
        testCases: [
            { input: '[2, 3]', expected_output: '5' },
            { input: '[10, -4]', expected_output: '6' },
        ],
    });
    return { prof, course, exercise };
}

describe('GET /api/exercises/:id', () => {
    it('returns the exercise with visible test cases', async () => {
        const { exercise } = await seedSumExercise();
        const student = await createUser({ role: 'student' });
        const res = await request(app)
            .get(`/api/exercises/${exercise.id}`)
            .set('Authorization', authHeader(student));
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Add two numbers');
        expect(res.body.testCases).toHaveLength(2);
    });
});

describe('POST /api/exercises/:id/submit', () => {
    it('scores a correct JavaScript solution 100% and records progress', async () => {
        const { course, exercise } = await seedSumExercise();
        const student = await createUser({ role: 'student' });
        await enroll(student.id, course.id);

        const res = await request(app)
            .post(`/api/exercises/${exercise.id}/submit`)
            .set('Authorization', authHeader(student))
            .send({ code: 'function add(a, b) { return a + b; }', language: 'javascript' });

        expect(res.status).toBe(200);
        expect(res.body.score).toBe(100);
        expect(res.body.testsPassed).toBe(2);
        expect(res.body.testsTotal).toBe(2);

        const progress = await db.query(
            'SELECT completion_status, best_score FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
            [student.id, exercise.id]
        );
        expect(progress.rows[0].completion_status).toBe('completed');
    });

    it('marks a wrong solution as failed with a partial/zero score', async () => {
        const { course, exercise } = await seedSumExercise();
        const student = await createUser({ role: 'student' });
        await enroll(student.id, course.id);

        const res = await request(app)
            .post(`/api/exercises/${exercise.id}/submit`)
            .set('Authorization', authHeader(student))
            .send({ code: 'function add(a, b) { return a - b; }', language: 'javascript' });

        expect(res.status).toBe(200);
        expect(res.body.testsPassed).toBeLessThan(res.body.testsTotal);
        expect(res.body.score).toBeLessThan(100);
    });
});
