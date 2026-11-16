import request from 'supertest';
import { Role } from '../src/modules/users/enums/role.enum.js';
import {
  createTestApp,
  dateIn,
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
        version: 1,
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

    it('400: rejects time zone offsets and misspelled ids', async () => {
      for (const timezone of ['+05:00', 'europe/madrid']) {
        const res = await createRoom({ ...ROOM, timezone }).expect(400);
        expect(res.body.error.details[0].field).toBe('timezone');
      }
    });

    it('400: an explicit null is a validation error, not a 500', async () => {
      const res = await createRoom({ ...ROOM, timezone: null }).expect(400);
      expect(res.body.error.details[0].field).toBe('timezone');
    });

    it('409: the room name is unique', async () => {
      await createRoom().expect(201);
      const res = await createRoom({ ...ROOM, capacity: 4 }).expect(409);
      expect(res.body.error).toMatchObject({
        code: 'ROOM_NAME_TAKEN',
        details: [{ field: 'name', message: expect.any(String) }],
      });
    });

    it('concurrency: the same room created 8 times at once exists only once', async () => {
      const results = await Promise.all(
        Array.from({ length: 8 }, () => createRoom()),
      );
      const statuses = results.map((r) => r.status).sort((a, b) => a - b);
      expect(statuses).toEqual([201, ...Array(7).fill(409)]);
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
    const patch = (id: string, body: object) =>
      http().patch(`/api/v1/rooms/${id}`).set(asAdmin()).send(body);

    it('400: an explicit null in any field is a validation error, not a 500', async () => {
      const { body: room } = await createRoom();
      for (const field of [
        'name',
        'capacity',
        'location',
        'timezone',
        'isActive',
        'version',
      ]) {
        const res = await patch(room.id, { [field]: null }).expect(400);
        expect(res.body.error.details[0].field).toBe(field);
      }
    });

    it('409: renaming to the name of another room', async () => {
      await createRoom();
      const { body: other } = await createRoom({ ...ROOM, name: 'Sala Pampa' });
      const res = await patch(other.id, { name: ROOM.name }).expect(409);
      expect(res.body.error.code).toBe('ROOM_NAME_TAKEN');
    });

    describe('optimistic locking (two admins editing the same room)', () => {
      it('every update increments the version', async () => {
        const { body: room } = await createRoom();
        const res = await patch(room.id, { capacity: 10, version: 1 });
        expect(res.body.version).toBe(2);
      });

      it('409 ROOM_MODIFIED: a save based on a stale version does not overwrite the newer change', async () => {
        const { body: room } = await createRoom();
        // Both admins opened the form at version 1; the first one saves.
        await patch(room.id, { capacity: 99, version: room.version }).expect(
          200,
        );
        const res = await patch(room.id, {
          name: 'Renombrada',
          capacity: room.capacity,
          version: room.version,
        }).expect(409);
        expect(res.body.error.code).toBe('ROOM_MODIFIED');

        const list = await http().get('/api/v1/rooms').set(asAdmin());
        expect(list.body[0]).toMatchObject({ name: ROOM.name, capacity: 99 });
      });

      it('concurrency: two simultaneous saves with the same version → one 200, one 409', async () => {
        const { body: room } = await createRoom();
        const results = await Promise.all([
          patch(room.id, { capacity: 10, version: room.version }),
          patch(room.id, { capacity: 20, version: room.version }),
        ]);
        expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
          200, 409,
        ]);
      });

      it('without a version the update is applied (last write wins)', async () => {
        const { body: room } = await createRoom();
        await patch(room.id, { capacity: 10 }).expect(200);
        await patch(room.id, { capacity: 20 }).expect(200);
      });
    });

    describe('time zone change', () => {
      const book = (roomId: string) =>
        http()
          .post('/api/v1/reservations')
          .set(asMember())
          .send({
            roomId,
            date: dateIn(2),
            startTime: '10:00',
            endTime: '11:00',
            title: 'Daily',
          });

      it('422 ROOM_HAS_RESERVATIONS: would move the local time of pending reservations', async () => {
        const { body: room } = await createRoom();
        await book(room.id).expect(201);
        const res = await patch(room.id, { timezone: 'Europe/Madrid' }).expect(
          422,
        );
        expect(res.body.error.code).toBe('ROOM_HAS_RESERVATIONS');
        // Sending the same zone again (the form always sends it) is not a change.
        await patch(room.id, {
          timezone: room.timezone,
          capacity: 10,
        }).expect(200);
      });

      it('200: allowed once the pending reservations are cancelled', async () => {
        const { body: room } = await createRoom();
        const { body: reservation } = await book(room.id);
        await http()
          .post(`/api/v1/reservations/${reservation.id}/cancel`)
          .set(asAdmin())
          .expect(200);
        const res = await patch(room.id, { timezone: 'Europe/Madrid' }).expect(
          200,
        );
        expect(res.body.timezone).toBe('Europe/Madrid');
      });
    });

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
