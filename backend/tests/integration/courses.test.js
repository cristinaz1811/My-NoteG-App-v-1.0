const request = require('supertest');
const { app } = require('../../server');
const { truncateAll, closePool } = require('../helpers/db');
const { createUser, createCourse, authHeader } = require('../helpers/factories');

beforeEach(() => truncateAll());
afterAll(() => closePool());

describe('POST /api/courses/professor/create', () => {
    it('lets a professor create a course', async () => {
        const prof = await createUser({ role: 'professor' });
        const res = await request(app)
            .post('/api/courses/professor/create')
            .set('Authorization', authHeader(prof))
            .send({ title: 'Algorithms 101', description: 'Intro', difficulty: 'easy' });
        expect(res.status).toBeLessThan(300);
        expect(res.body.id).toBeDefined();
        expect(res.body.title).toBe('Algorithms 101');
    });

    it('generates an enrollment code for a private course', async () => {
        const prof = await createUser({ role: 'professor' });
        const res = await request(app)
            .post('/api/courses/professor/create')
            .set('Authorization', authHeader(prof))
            .send({ title: 'Private Course', description: 'x', is_private: true });
        expect(res.body.enrollment_code).toMatch(/^[0-9A-F]{6}$/);
    });

    it('forbids a student from creating a course (403)', async () => {
        const student = await createUser({ role: 'student' });
        const res = await request(app)
            .post('/api/courses/professor/create')
            .set('Authorization', authHeader(student))
            .send({ title: 'Nope', description: 'x' });
        expect(res.status).toBe(403);
    });
});

describe('POST /api/courses/enroll-by-code', () => {
    it('enrolls a student into a private course using its code', async () => {
        const prof = await createUser({ role: 'professor' });
        const course = await createCourse(prof.id, { is_private: true });
        const student = await createUser({ role: 'student' });

        const res = await request(app)
            .post('/api/courses/enroll-by-code')
            .set('Authorization', authHeader(student))
            .send({ code: course.enrollment_code });
        expect(res.status).toBe(201);
    });

    it('rejects an invalid enrollment code with 404', async () => {
        const student = await createUser({ role: 'student' });
        const res = await request(app)
            .post('/api/courses/enroll-by-code')
            .set('Authorization', authHeader(student))
            .send({ code: 'ZZZZZZ' });
        expect(res.status).toBe(404);
    });
});
