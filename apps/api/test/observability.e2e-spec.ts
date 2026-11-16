import request from 'supertest';
import { Role } from '../src/modules/users/enums/role.enum.js';
import {
  createTestApp,
  loginAs,
  resetDb,
  type TestContext,
} from './utils/test-app.js';

describe('Observability (e2e)', () => {
  let ctx: TestContext;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(() => resetDb(ctx.db));
  afterAll(() => ctx.app.close());

  it('every response carries an X-Request-Id, also errors', async () => {
    const ok = await http().get('/api/v1/health').expect(200);
    expect(ok.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const err = await http().get('/api/v1/rooms').expect(401);
    expect(err.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('reuses a safe X-Request-Id sent by the client', async () => {
    const res = await http()
      .get('/api/v1/health')
      .set('X-Request-Id', 'trace-123')
      .expect(200);
    expect(res.headers['x-request-id']).toBe('trace-123');
  });

  it('GET /health is public and checks the database', async () => {
    const res = await http().get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('GET /metrics: 401 without token, 403 for a member', async () => {
    await http().get('/api/v1/metrics').expect(401);
    const { token } = await loginAs(ctx, 'member@demo.com');
    await http()
      .get('/api/v1/metrics')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /metrics: admin sees counters grouped by route pattern', async () => {
    const { token } = await loginAs(ctx, 'admin@demo.com', Role.Admin);
    await http()
      .patch('/api/v1/rooms/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' })
      .expect(404);

    const res = await http()
      .get('/api/v1/metrics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.requests.total).toBeGreaterThan(0);
    expect(res.body.routes).toContainEqual(
      expect.objectContaining({ route: 'PATCH /api/v1/rooms/:id', count: 1 }),
    );
  });
});
