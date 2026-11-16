import request from 'supertest';
import { createTestApp, resetDb, type TestContext } from './utils/test-app.js';

// The environment is read when AppModule is imported, so the limit must be set before the imports run.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT = '3';
});

/** Login and register share a per-IP limit (AUTH_RATE_LIMIT per minute). */
describe('Auth rate limit (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDb(ctx.db);
  });
  afterAll(() => ctx.app.close());

  const login = () =>
    request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@demo.com', password: 'wrong-password' });

  it('429 TOO_MANY_REQUESTS after the allowed attempts, in the unified error format', async () => {
    for (let i = 0; i < 3; i++) await login().expect(401);
    const res = await login().expect(429);
    expect(res.body.error).toEqual({
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas peticiones. Inténtalo más tarde.',
    });
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('other routes are not limited', async () => {
    for (let i = 0; i < 6; i++) {
      await request(ctx.app.getHttpServer()).get('/api/v1/health').expect(200);
    }
  });

  it('sends security headers (helmet)', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
