import request from 'supertest';
import { Role } from '../src/modules/users/enums/role.enum.js';
import {
  createTestApp,
  createUser,
  loginAs,
  resetDb,
  type TestContext,
} from './utils/test-app.js';

describe('Auth (e2e)', () => {
  let ctx: TestContext;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(() => resetDb(ctx.db));
  afterAll(() => ctx.app.close());

  describe('POST /api/auth/register', () => {
    it('201: crea un member, normaliza el email y no devuelve la contraseña', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({
          name: ' Ana ',
          email: ' Ana@Demo.COM ',
          password: 'password123',
        })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toEqual({
        id: expect.any(String),
        name: 'Ana',
        email: 'ana@demo.com',
        role: 'member',
      });
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('guarda la contraseña como hash argon2id, no en texto plano', async () => {
      await http()
        .post('/api/auth/register')
        .send({ name: 'Ana', email: 'ana@demo.com', password: 'password123' });
      const [row] = await ctx.db.query(
        `SELECT password_hash FROM users WHERE email = 'ana@demo.com'`,
      );
      expect(row.password_hash).toMatch(/^\$argon2id\$/);
      expect(row.password_hash).not.toContain('password123');
    });

    it('rechaza un rol enviado en el body: 400 por campo no permitido', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({
          name: 'Eve',
          email: 'eve@demo.com',
          password: 'password123',
          role: 'admin',
        })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('400: errores de validación por campo', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ name: '', email: 'no-email', password: '123' })
        .expect(400);
      expect(res.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos enviados.',
      });
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          { field: 'name', message: 'Indica tu nombre.' },
          { field: 'email', message: 'Introduce un email válido.' },
          {
            field: 'password',
            message: 'La contraseña debe tener al menos 8 caracteres.',
          },
        ]),
      );
    });

    it('409: email ya registrado (sin distinguir mayúsculas)', async () => {
      await createUser(ctx.db, {
        email: 'ana@demo.com',
        password: 'password123',
      });
      const res = await http()
        .post('/api/auth/register')
        .send({ name: 'Ana', email: 'ANA@demo.com', password: 'password123' })
        .expect(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(() =>
      createUser(ctx.db, {
        email: 'admin@demo.com',
        password: 'password123',
        role: Role.Admin,
      }),
    );

    it('200: devuelve token y usuario', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ email: 'Admin@demo.com', password: 'password123' })
        .expect(200);
      expect(res.body.user.role).toBe('admin');
    });

    it('401: mismo mensaje para contraseña errónea y email inexistente', async () => {
      const wrong = await http()
        .post('/api/auth/login')
        .send({ email: 'admin@demo.com', password: 'nope' })
        .expect(401);
      const missing = await http()
        .post('/api/auth/login')
        .send({ email: 'nadie@demo.com', password: 'nope' })
        .expect(401);
      expect(wrong.body).toEqual(missing.body);
      expect(wrong.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Email o contraseña incorrectos.',
      });
    });

    it('400: body mal formado', async () => {
      await http().post('/api/auth/login').send({ email: 'x' }).expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('200 con Bearer token válido', async () => {
      const { token } = await loginAs(ctx, 'ana@demo.com');
      const res = await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.email).toBe('ana@demo.com');
    });

    it('401 sin token', async () => {
      const res = await http().get('/api/auth/me').expect(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('401 con token inválido o con esquema que no es Bearer', async () => {
      await http()
        .get('/api/auth/me')
        .set('Authorization', 'Bearer abc.def.ghi')
        .expect(401);
      const { token } = await loginAs(ctx, 'ana@demo.com');
      await http()
        .get('/api/auth/me')
        .set('Authorization', `Basic ${token}`)
        .expect(401);
    });

    it('401 si el usuario del token ya no existe', async () => {
      const { token } = await loginAs(ctx, 'ana@demo.com');
      await resetDb(ctx.db);
      const res = await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  it('404 con el formato de error único en rutas inexistentes', async () => {
    const res = await http().get('/api/no-existe').expect(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'El recurso no existe.' },
    });
  });
});
