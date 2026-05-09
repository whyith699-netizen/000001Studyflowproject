jest.mock('./config/firebase', () => ({ admin: { apps: [] }, db: null }));

jest.mock('./config/database', () => ({
    query: jest.fn(),
    testConnection: jest.fn(),
}));

const request = require('supertest');
const { query, testConnection } = require('./config/database');
const app = require('./app');

function tokenFor(uid = 'user-1', email = 'user@example.com') {
    const payload = Buffer.from(JSON.stringify({ user_id: uid, sub: uid, email })).toString('base64url');
    return `header.${payload}.signature`;
}

function auth(uid = 'user-1') {
    return { Authorization: `Bearer ${tokenFor(uid)}` };
}

beforeEach(() => {
    jest.clearAllMocks();
    testConnection.mockResolvedValue(true);
});

describe('GET /health', () => {
    it('should return 200 and ok status', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('message', 'StudyFlow API');
        expect(res.body).toHaveProperty('db', 'connected');
    });
});

describe('authenticated API routes', () => {
    it('rejects requests without a Firebase token', async () => {
        const res = await request(app).get('/api/calendar-events/user-1');

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    it('rejects cross-user reads', async () => {
        const res = await request(app)
            .get('/api/study-sessions/user-2')
            .set(auth('user-1'));

        expect(res.statusCode).toBe(403);
    });

    it('returns calendar events using frontend field names', async () => {
        query.mockResolvedValueOnce([{
            id: 'cal-1',
            user_id: 'user-1',
            title: 'Exam',
            date: '2026-05-09',
            end_date: '2026-05-10',
            time: '08:00',
            color_key: 'sky',
            description: 'Room A',
            created_at_ms: 1760000000000,
            updated_at_ms: 1760000000100,
        }]);

        const res = await request(app)
            .get('/api/calendar-events/user-1')
            .set(auth('user-1'));

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([{
            id: 'cal-1',
            userId: 'user-1',
            title: 'Exam',
            date: '2026-05-09',
            endDate: '2026-05-10',
            time: '08:00',
            colorKey: 'sky',
            description: 'Room A',
            createdAt: 1760000000000,
            updatedAt: 1760000000100,
        }]);
    });

    it('upserts uniforms for the authenticated owner', async () => {
        query.mockResolvedValueOnce({ affectedRows: 1 });

        const res = await request(app)
            .put('/api/uniforms/user-1')
            .set(auth('user-1'))
            .send({ days: { monday: 'Blue' } });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ ok: true });
        expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO uniforms'), [
            'user-1',
            JSON.stringify({ monday: 'Blue' }),
        ]);
    });
});
