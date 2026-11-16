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

      const res = await http()
        .get('/api/v1/reservations/me')
        .set(auth(ana.token))
        .expect(200);
      expect(res.body.upcoming.map((r: { title: string }) => r.title)).toEqual([
        'in progress',
        'soon',
        'later',
      ]);
      expect(res.body.past.map((r: { title: string }) => r.title)).toEqual([
        'cancelled',
        'yesterday',
      ]);
      expect(res.body.upcoming[0].room.name).toBe('Sala Andes');
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
