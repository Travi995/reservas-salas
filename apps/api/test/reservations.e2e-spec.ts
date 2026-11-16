import request from 'supertest';
import { Reservation } from '../src/modules/reservations/entities/reservation.entity.js';
import type { Room } from '../src/modules/rooms/entities/room.entity.js';
import { Role } from '../src/modules/users/enums/role.enum.js';
import {
  createRoom,
  createTestApp,
  dateIn,
  loginAs,
  resetDb,
  type TestContext,
} from './utils/test-app.js';

describe('Reservations (e2e)', () => {
  let ctx: TestContext;
  let room: Room;
  let admin: string;
  let ana: { token: string; id: string };
  let bob: { token: string; id: string };
  const tomorrow = dateIn(1);
  const http = () => request(ctx.app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const book = (token: string, body: Partial<Record<string, string>> = {}) =>
    http()
      .post('/api/v1/reservations')
      .set(auth(token))
      .send({
        roomId: room.id,
        date: tomorrow,
        startTime: '10:00',
        endTime: '11:00',
        title: 'Daily',
        ...body,
      });

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    room = await createRoom(ctx.db);
    admin = (await loginAs(ctx, 'admin@demo.com', Role.Admin)).token;
    const a = await loginAs(ctx, 'ana@demo.com');
    const b = await loginAs(ctx, 'bob@demo.com');
    ana = { token: a.token, id: a.user.id };
    bob = { token: b.token, id: b.user.id };
  });
  afterAll(() => ctx.app.close());

  describe('POST /api/reservations', () => {
    it('201: converts the room-local wall clock to UTC and returns the room', async () => {
      const res = await book(ana.token).expect(201);
      expect(res.body).toMatchObject({
        title: 'Daily',
        status: 'active',
        startsAt: `${tomorrow}T13:00:00.000Z`, // 10:00 in Buenos Aires (UTC-3)
        endsAt: `${tomorrow}T14:00:00.000Z`,
        room: { id: room.id, name: 'Sala Andes' },
      });
    });

    describe('no overlaps in the same room', () => {
      beforeEach(() => book(ana.token).expect(201));

      it('409 with the conflicting slot in the message', async () => {
        const res = await book(bob.token, {
          startTime: '10:30',
          endTime: '11:30',
        }).expect(409);
        expect(res.body.error).toEqual({
          code: 'ROOM_OVERLAP',
          message: 'La sala ya está reservada de 10:00 a 11:00.',
        });
      });

      it('409 that says it is your own reservation (e.g. a retry after a lost response)', async () => {
        const res = await book(ana.token).expect(409);
        expect(res.body.error.message).toBe(
          'Ya tienes una reserva en esta sala de 10:00 a 11:00 («Daily»). Revísala en Mis reservas.',
        );
      });

      it('409 for a slot fully inside or fully containing an existing one', async () => {
        await book(bob.token, { startTime: '10:15', endTime: '10:45' }).expect(
          409,
        );
        await book(bob.token, { startTime: '09:00', endTime: '12:00' }).expect(
          409,
        );
      });

      it('201 for back-to-back slots: 11:00–12:00 right after 10:00–11:00', async () => {
        await book(bob.token, { startTime: '11:00', endTime: '12:00' }).expect(
          201,
        );
        await book(bob.token, { startTime: '09:00', endTime: '10:00' }).expect(
          201,
        );
      });

      it('201 for the same time in another room', async () => {
        const other = await createRoom(ctx.db, { name: 'Sala Pampa' });
        await book(bob.token, { roomId: other.id }).expect(201);
      });

      it('a cancelled reservation frees its slot', async () => {
        const [existing] = await ctx.db.getRepository(Reservation).find();
        await http()
          .post(`/api/v1/reservations/${existing.id}/cancel`)
          .set(auth(ana.token))
          .expect(200);
        await book(bob.token).expect(201);
      });
    });

    it('concurrency: 10 identical simultaneous requests → exactly one 201, the rest 409', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => book(ana.token)),
      );
      const statuses = results.map((r) => r.status).sort((a, b) => a - b);
      expect(statuses).toEqual([201, ...Array(9).fill(409)]);
      expect(await ctx.db.getRepository(Reservation).count()).toBe(1);
    });

    it('concurrency: partially overlapping simultaneous requests never end in a 500', async () => {
      // 20 one-hour slots starting every 20 minutes: each one overlaps its neighbours.
      // Without serializing the bookings of a room, Postgres aborts some of them with a deadlock.
      const users = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          loginAs(ctx, `racer${i}@demo.com`),
        ),
      );
      const hhmm = (m: number) =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const results = await Promise.all(
        users.map(({ token }, i) =>
          book(token, {
            startTime: hhmm(8 * 60 + i * 20),
            endTime: hhmm(9 * 60 + i * 20),
          }),
        ),
      );
      expect(results.filter((r) => ![201, 409].includes(r.status))).toEqual([]);
      for (const r of results.filter((r) => r.status === 409)) {
        expect(r.body.error.code).toBe('ROOM_OVERLAP');
      }
      const saved = await ctx.db
        .getRepository(Reservation)
        .find({ order: { startsAt: 'ASC' } });
      expect(saved.length).toBe(results.filter((r) => r.status === 201).length);
      for (let i = 1; i < saved.length; i++) {
        expect(saved[i].startsAt >= saved[i - 1].endsAt).toBe(true);
      }
    });

    it('400: dates outside the supported range (year 9999)', async () => {
      await book(ana.token, { date: '9999-12-31' }).expect(400);
    });

    describe('422 business rules', () => {
      it('end must be after start', async () => {
        const res = await book(ana.token, {
          startTime: '11:00',
          endTime: '10:00',
        }).expect(422);
        expect(res.body.error.code).toBe('END_BEFORE_START');
        await book(ana.token, { startTime: '10:00', endTime: '10:00' }).expect(
          422,
        );
      });

      it('cannot book in the past', async () => {
        const res = await book(ana.token, { date: dateIn(-1) }).expect(422);
        expect(res.body.error).toEqual({
          code: 'IN_THE_PAST',
          message: 'No se puede reservar en el pasado.',
        });
      });

      it('duration: exactly 15 min and exactly 4 h are allowed', async () => {
        await book(ana.token, { startTime: '08:00', endTime: '08:15' }).expect(
          201,
        );
        await book(ana.token, { startTime: '09:00', endTime: '13:00' }).expect(
          201,
        );
      });

      it('duration: 14 min and 4 h 1 min are rejected', async () => {
        const short = await book(ana.token, {
          startTime: '08:00',
          endTime: '08:14',
        }).expect(422);
        expect(short.body.error.code).toBe('DURATION_OUT_OF_RANGE');
        await book(ana.token, { startTime: '09:00', endTime: '13:01' }).expect(
          422,
        );
      });

      it('an inactive room does not accept new reservations', async () => {
        await ctx.db
          .getRepository(Reservation)
          .manager.update('rooms', { id: room.id }, { isActive: false });
        const res = await book(ana.token).expect(422);
        expect(res.body.error.code).toBe('ROOM_INACTIVE');
      });

      it('the rules apply to admins too', async () => {
        await book(admin, { startTime: '09:00', endTime: '14:00' }).expect(422);
      });
    });

    it('404: unknown room', async () => {
      const res = await book(ana.token, {
        roomId: '00000000-0000-4000-8000-000000000000',
      }).expect(404);
      expect(res.body.error.code).toBe('ROOM_NOT_FOUND');
    });

    it('400: field errors for malformed input', async () => {
      const res = await book(ana.token, {
        date: '2026-02-30',
        startTime: '25:00',
        title: ' ',
      }).expect(400);
      expect(
        res.body.error.details.map((d: { field: string }) => d.field).sort(),
      ).toEqual(['date', 'startTime', 'title']);
    });

    it('401: requires a token', async () => {
      await http().post('/api/v1/reservations').send({}).expect(401);
    });
  });

  describe('GET /api/reservations/me', () => {
    it('splits upcoming (soonest first) and past (finished or cancelled, most recent first)', async () => {
      const repo = ctx.db.getRepository(Reservation);
      const hour = 3_600_000;
      const now = Date.now();
      const insert = (
        title: string,
        startOffset: number,
        status: 'active' | 'cancelled' = 'active',
      ) =>
        repo.save({
          roomId: room.id,
          userId: ana.id,
          title,
          startsAt: new Date(now + startOffset * hour),
          endsAt: new Date(now + (startOffset + 1) * hour),
          status: status as Reservation['status'],
          cancelledAt: status === 'cancelled' ? new Date() : null,
        });
      await insert('later', 48);
      await insert('soon', 24);
      await insert('in progress', -0.5);
      await insert('yesterday', -24);
      await insert('cancelled', 72, 'cancelled');
      // Someone else's reservation must not show up.
      await repo.save({
        roomId: room.id,
        userId: bob.id,
        title: 'bob',
        startsAt: new Date(now + 100 * hour),
        endsAt: new Date(now + 101 * hour),
      });

      const mine = (q: string) =>
        http()
          .get(`/api/v1/reservations/me${q}`)
          .set(auth(ana.token))
          .expect(200);
      const titles = (body: { items: { title: string }[] }) =>
        body.items.map((r) => r.title);

      const upcoming = await mine('');
      // Split by date only: a future cancelled reservation is still "upcoming" (shown as cancelled).
      expect(titles(upcoming.body)).toEqual([
        'in progress',
        'soon',
        'later',
        'cancelled',
      ]);
      expect(upcoming.body.items[0].room.name).toBe('Sala Andes');
      expect(upcoming.body.meta).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 4,
        totalPages: 1,
        // The cancelled one is listed but not counted as an upcoming reservation.
        activeItems: 3,
      });

      const past = await mine('?scope=past');
      expect(titles(past.body)).toEqual(['yesterday']);

      // Pagination happens in the database: page 2 of size 3 holds only the fourth item.
      const page2 = await mine('?scope=upcoming&page=2&pageSize=3');
      expect(titles(page2.body)).toEqual(['cancelled']);
      expect(page2.body.meta).toEqual({
        page: 2,
        pageSize: 3,
        totalItems: 4,
        totalPages: 2,
        activeItems: 3,
      });
    });

    it('400 for invalid pagination params', async () => {
      const res = await http()
        .get('/api/v1/reservations/me?page=0&pageSize=101&scope=all')
        .set(auth(ana.token))
        .expect(400);
      expect(
        res.body.error.details.map((d: { field: string }) => d.field).sort(),
      ).toEqual(['page', 'pageSize', 'scope']);
    });

    it('400 (not 500) for a huge page and a type message for non-numbers', async () => {
      const huge = await http()
        .get('/api/v1/reservations/me?page=9999999999999999999&pageSize=100')
        .set(auth(ana.token))
        .expect(400);
      expect(huge.body.error.details).toEqual([
        { field: 'page', message: 'La página no puede superar 100000.' },
      ]);
      const abc = await http()
        .get('/api/v1/reservations/me?pageSize=abc&foo=1')
        .set(auth(ana.token))
        .expect(400);
      expect(abc.body.error.details).toEqual(
        expect.arrayContaining([
          {
            field: 'pageSize',
            message: 'El tamaño de página debe ser un número entero.',
          },
          { field: 'foo', message: 'Este campo no está permitido.' },
        ]),
      );
    });
  });

  describe('GET /api/reservations (admin)', () => {
    beforeEach(async () => {
      const other = await createRoom(ctx.db, { name: 'Sala Pampa' });
      await book(ana.token, {
        title: 'Daily ana',
        startTime: '09:00',
        endTime: '10:00',
      }).expect(201);
      await book(bob.token, {
        title: 'Retro',
        startTime: '10:00',
        endTime: '11:00',
      }).expect(201);
      await book(bob.token, { title: 'Planning', roomId: other.id }).expect(
        201,
      );
      const cancelled = await book(ana.token, {
        title: '50% off',
        startTime: '12:00',
        endTime: '13:00',
      }).expect(201);
      await http()
        .post(`/api/v1/reservations/${cancelled.body.id}/cancel`)
        .set(auth(ana.token))
        .expect(200);
    });
    const list = (q = '', token = admin) =>
      http().get(`/api/v1/reservations${q}`).set(auth(token));

    it('403 for members', async () => {
      await list('', ana.token).expect(403);
    });

    it("200: every user's reservations, paginated, with who booked them", async () => {
      const res = await list('?pageSize=3').expect(200);
      expect(res.body.meta).toEqual({
        page: 1,
        pageSize: 3,
        totalItems: 4,
        totalPages: 2,
      });
      expect(res.body.items).toHaveLength(3);
      expect(res.body.items[0].user).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
      });
      const next = await list('?pageSize=3&page=2').expect(200);
      expect(next.body.items).toHaveLength(1);
    });

    it('searches by title, room, user name or email (case-insensitive)', async () => {
      const titles = async (q: string) =>
        (await list(q).expect(200)).body.items
          .map((r: { title: string }) => r.title)
          .sort();
      expect(await titles('?search=RETRO')).toEqual(['Retro']);
      expect(await titles('?search=pampa')).toEqual(['Planning']);
      expect(await titles('?search=bob@demo')).toEqual(['Planning', 'Retro']);
      // "%" is matched literally, not as a wildcard.
      expect(await titles('?search=50%25')).toEqual(['50% off']);
    });

    it('ignores accents in the search', async () => {
      await book(ana.token, {
        title: 'Reunión con Ñúñez',
        startTime: '15:00',
        endTime: '16:00',
      }).expect(201);
      const titles = async (q: string) =>
        (await list(q).expect(200)).body.items.map(
          (r: { title: string }) => r.title,
        );
      expect(await titles('?search=reunion')).toEqual(['Reunión con Ñúñez']);
      expect(await titles('?search=NUNEZ')).toEqual(['Reunión con Ñúñez']);
    });

    it('400 (not 500) for a NUL byte in the search', async () => {
      const res = await list('?search=a%00b').expect(400);
      expect(res.body.error.details).toEqual([
        {
          field: 'search',
          message: 'El texto contiene caracteres no válidos.',
        },
      ]);
    });

    it('filters by status and room', async () => {
      const cancelled = await list('?status=cancelled').expect(200);
      expect(
        cancelled.body.items.map((r: { title: string }) => r.title),
      ).toEqual(['50% off']);
      const inRoom = await list(`?roomId=${room.id}&status=active`).expect(200);
      expect(inRoom.body.meta.totalItems).toBe(2);
      // The date scope does not depend on the status: future cancelled ones are "upcoming".
      const cancelledUpcoming = await list(
        '?status=cancelled&scope=upcoming',
      ).expect(200);
      expect(cancelledUpcoming.body.meta.totalItems).toBe(1);
      const cancelledPast = await list('?status=cancelled&scope=past').expect(
        200,
      );
      expect(cancelledPast.body.meta.totalItems).toBe(0);
    });
  });

  describe('POST /api/reservations/:id/cancel', () => {
    let id: string;
    beforeEach(async () => {
      id = (await book(ana.token).expect(201)).body.id;
    });
    const cancel = (token: string, reservationId = id) =>
      http()
        .post(`/api/v1/reservations/${reservationId}/cancel`)
        .set(auth(token));

    it('200: the owner cancels their reservation', async () => {
      const res = await cancel(ana.token).expect(200);
      expect(res.body.status).toBe('cancelled');
    });

    it("403: a member cannot cancel someone else's reservation", async () => {
      const res = await cancel(bob.token).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it("200: an admin can cancel anyone's reservation", async () => {
      await cancel(admin).expect(200);
    });

    it('records who cancelled: the owner sees that an admin did it', async () => {
      const res = await cancel(admin).expect(200);
      expect(res.body.cancelledBy).toMatchObject({ name: 'admin' });

      const mine = await http()
        .get('/api/v1/reservations/me')
        .set(auth(ana.token))
        .expect(200);
      expect(mine.body.items[0]).toMatchObject({
        status: 'cancelled',
        cancelledBy: { id: expect.any(String), name: 'admin' },
      });
      // Cancelled reservations stay in the list but are not counted as upcoming.
      expect(mine.body.meta).toMatchObject({ totalItems: 1, activeItems: 0 });
    });

    it('cancelledBy is the owner when they cancel, and null while active', async () => {
      const active = await http()
        .get('/api/v1/reservations/me')
        .set(auth(ana.token));
      expect(active.body.items[0].cancelledBy).toBeNull();
      expect(active.body.meta.activeItems).toBe(1);

      const res = await cancel(ana.token).expect(200);
      expect(res.body.cancelledBy).toEqual({ id: ana.id, name: 'ana' });
    });

    it('409: already cancelled', async () => {
      await cancel(ana.token).expect(200);
      const res = await cancel(ana.token).expect(409);
      expect(res.body.error.code).toBe('ALREADY_CANCELLED');
    });

    it('422: cannot cancel a reservation that already started, not even an admin', async () => {
      const now = Date.now();
      const started = await ctx.db.getRepository(Reservation).save({
        roomId: room.id,
        userId: ana.id,
        title: 'started',
        startsAt: new Date(now - 10 * 60_000),
        endsAt: new Date(now + 50 * 60_000),
      });
      expect(
        (await cancel(ana.token, started.id).expect(422)).body.error.code,
      ).toBe('ALREADY_STARTED');
      await cancel(admin, started.id).expect(422);
    });

    it('404 unknown and 400 malformed id', async () => {
      await cancel(ana.token, '00000000-0000-4000-8000-000000000000').expect(
        404,
      );
      await cancel(ana.token, 'nope').expect(400);
    });
  });
});
