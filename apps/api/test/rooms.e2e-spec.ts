import request from 'supertest';
import { Role } from '../src/modules/users/enums/role.enum.js';
import {
  createTestApp,
  loginAs,
  resetDb,
  type TestContext,
} from './utils/test-app.js';

const ROOM = { name: 'Sala Andes', capacity: 8, location: 'Oficina Centro' };

describe('Rooms (e2e)', () => {
  let ctx: TestContext;
  let admin: string;
  let member: string;
  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${admin}` });
  const asMember = () => ({ Authorization: `Bearer ${member}` });

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    admin = (await loginAs(ctx, 'admin@demo.com', Role.Admin)).token;
    member = (await loginAs(ctx, 'member@demo.com')).token;
  });
  afterAll(() => ctx.app.close());

  const createRoom = (body: object = ROOM) =>
    http().post('/api/v1/rooms').set(asAdmin()).send(body);

  describe('POST /api/rooms', () => {
    it('201: admin creates an active room with the default time zone', async () => {
      const res = await createRoom().expect(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        ...ROOM,
        timezone: 'America/Argentina/Buenos_Aires',
        isActive: true,
      });
    });

    it('201: accepts a valid IANA time zone', async () => {
      const res = await createRoom({
        ...ROOM,
        timezone: 'Europe/Madrid',
      }).expect(201);
      expect(res.body.timezone).toBe('Europe/Madrid');
    });

    it('400: field errors for invalid data', async () => {
      const res = await createRoom({
        name: ' ',
        capacity: 0,
        location: '',
        timezone: 'Mars/Base',
      }).expect(400);
      expect(
        res.body.error.details.map((d: { field: string }) => d.field).sort(),
      ).toEqual(['capacity', 'location', 'name', 'timezone']);
    });

    it('403: members cannot create rooms', async () => {
      const res = await http()
        .post('/api/v1/rooms')
        .set(asMember())
        .send(ROOM)
        .expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('401: requires a token', async () => {
      await http().post('/api/v1/rooms').send(ROOM).expect(401);
    });
  });

  describe('PATCH /api/rooms/:id', () => {
    it('200: admin edits and deactivates a room', async () => {
      const { body: room } = await createRoom();
      const res = await http()
        .patch(`/api/v1/rooms/${room.id}`)
        .set(asAdmin())
        .send({ capacity: 10, isActive: false })
        .expect(200);
      expect(res.body).toMatchObject({
        capacity: 10,
        isActive: false,
        name: ROOM.name,
      });
    });

    it('404: unknown room', async () => {
      const res = await http()
        .patch('/api/v1/rooms/00000000-0000-4000-8000-000000000000')
        .set(asAdmin())
        .send({ capacity: 3 })
        .expect(404);
      expect(res.body.error.code).toBe('ROOM_NOT_FOUND');
    });

    it('400: malformed id', async () => {
      const res = await http()
        .patch('/api/v1/rooms/not-a-uuid')
        .set(asAdmin())
        .send({ capacity: 3 })
        .expect(400);
      expect(res.body.error.details).toEqual([
        { field: 'id', message: 'El identificador no es válido.' },
      ]);
    });

    it('403: members cannot edit rooms', async () => {
      const { body: room } = await createRoom();
      await http()
        .patch(`/api/v1/rooms/${room.id}`)
        .set(asMember())
        .send({ isActive: false })
        .expect(403);
    });
  });

  describe('GET /api/rooms', () => {
    beforeEach(async () => {
      const { body: inactive } = await createRoom({
        ...ROOM,
        name: 'Sala Vieja',
      });
      await http()
        .patch(`/api/v1/rooms/${inactive.id}`)
        .set(asAdmin())
        .send({ isActive: false });
      await createRoom();
    });

    it('members only see active rooms, even when asking for inactive ones', async () => {
      const res = await http()
        .get('/api/v1/rooms?includeInactive=true')
        .set(asMember())
        .expect(200);
      expect(res.body.map((r: { name: string }) => r.name)).toEqual([
        'Sala Andes',
      ]);
    });

    it('admins can include inactive rooms', async () => {
      const res = await http()
        .get('/api/v1/rooms?includeInactive=true')
        .set(asAdmin())
        .expect(200);
      expect(res.body.map((r: { name: string }) => r.name)).toEqual([
        'Sala Andes',
        'Sala Vieja',
      ]);
    });

    it('400: includeInactive must be a boolean', async () => {
      await http()
        .get('/api/v1/rooms?includeInactive=maybe')
        .set(asAdmin())
        .expect(400);
    });
  });
});
