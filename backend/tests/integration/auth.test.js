const request = require('supertest');
const { app } = require('../../server');
const { truncateAll, closePool } = require('../helpers/db');
const { createUser } = require('../helpers/factories');

beforeEach(() => truncateAll());
afterAll(() => closePool());

describe('POST /api/auth/register', () => {
    it('creates a user and returns a JWT token', async () => {
        const res = await request(app).post('/api/auth/register').send({
            username: 'alice_test',
            email: 'alice@university.edu',
            password: 'Passw0rd!',
            role: 'student',
        });
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toMatchObject({ username: 'alice_test', role: 'student' });
    });

    it('rejects missing fields with 400', async () => {
        const res = await request(app).post('/api/auth/register').send({ username: 'x' });
        expect(res.status).toBe(400);
    });

    it('rejects a duplicate email/username with 409', async () => {
        await createUser({ username: 'bob_test', email: 'bob@university.edu' });
        const res = await request(app).post('/api/auth/register').send({
            username: 'bob_test',
            email: 'bob@university.edu',
            password: 'Passw0rd!',
        });
        expect(res.status).toBe(409);
    });
});

describe('POST /api/auth/login', () => {
    it('returns a token for valid credentials', async () => {
        const user = await createUser({ email: 'carol@university.edu', password: 'Secret123!' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'Secret123!' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    it('rejects wrong password with 401', async () => {
        const user = await createUser({ email: 'dave@university.edu', password: 'Secret123!' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'wrong' });
        expect(res.status).toBe(401);
    });
});

describe('protected routes', () => {
    it('rejects GET /api/auth/profile without a token (401)', async () => {
        const res = await request(app).get('/api/auth/profile');
        expect(res.status).toBe(401);
    });
});
