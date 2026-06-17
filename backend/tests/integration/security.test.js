const request = require('supertest');
const { app } = require('../../server');
const { truncateAll, closePool, db } = require('../helpers/db');
const { createUser, signTestToken, authHeader } = require('../helpers/factories');

beforeEach(() => truncateAll());
afterAll(() => closePool());

describe('JWT authentication', () => {
    it('rejects a request with no token (401)', async () => {
        const res = await request(app).get('/api/auth/profile');
        expect(res.status).toBe(401);
    });

    it('rejects a malformed token (401)', async () => {
        const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', 'Bearer not.a.valid.token');
        expect(res.status).toBe(401);
    });

    it('rejects an expired token (401)', async () => {
        const user = await createUser({ role: 'student' });
        const expired = signTestToken(user, { expiresIn: '-1s' });
        const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${expired}`);
        expect(res.status).toBe(401);
    });

    it('accepts a valid token (200)', async () => {
        const user = await createUser({ role: 'student' });
        const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', authHeader(user));
        expect(res.status).toBe(200);
    });
});

describe('Role-based access control', () => {
    it('forbids a non-admin from an admin-only route (403)', async () => {
        const prof = await createUser({ role: 'professor' });
        const res = await request(app)
            .post('/api/courses') // mounted with isAdmin
            .set('Authorization', authHeader(prof))
            .send({ title: 'x', description: 'y' });
        expect(res.status).toBe(403);
    });
});

describe('SQL injection resistance', () => {
    it('does not allow a login bypass via injection payloads', async () => {
        await createUser({ email: 'victim@university.edu', password: 'Secret123!' });
        const payloads = ["' OR '1'='1", "' OR 1=1 --", "admin'--"];
        for (const payload of payloads) {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: payload, password: payload });
            expect(res.status).toBe(401);
        }
    });

    it('treats a DROP TABLE payload as plain data (table survives)', async () => {
        await createUser({ email: 'safe@university.edu', password: 'Secret123!' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: "'; DROP TABLE users; --", password: 'x' });
        expect(res.status).toBe(401);
        const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM users');
        expect(rows[0].n).toBe(1);
    });
});

describe('Password hashing', () => {
    it('stores a bcrypt hash, never the plaintext password', async () => {
        await request(app).post('/api/auth/register').send({
            username: 'hash_test',
            email: 'hash@university.edu',
            password: 'Pl;aintext123!',
            role: 'student',
        });
        const { rows } = await db.query('SELECT password_hash FROM users WHERE username = $1', ['hash_test']);
        expect(rows).toHaveLength(1);
        expect(rows[0].password_hash).not.toBe('Pl;aintext123!');
        expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/); // bcrypt prefix
    });
});
