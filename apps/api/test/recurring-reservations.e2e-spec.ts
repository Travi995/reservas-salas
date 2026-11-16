import request from 'supertest';
import { Reservation } from '../src/modules/reservations/entities/reservation.entity.js';
import type { Room } from '../src/modules/rooms/entities/room.entity.js';
import {
  createRoom,
  createTestApp,
  dateIn,
  loginAs,
  resetDb,
  type TestContext,
} from './utils/test-app.js';

describe('Recurring reservations (e2e)', () => {
  let ctx: TestContext;
  let room: Room;
  let ana: string;
  let bob: string;
  const http = () => request(ctx.app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const ddmmyyyy = (d: string) => d.split('-').reverse().join('/');

  const series = (token: string, body: Record<string, unknown> = {}) =>
    http()
      .post('/api/v1/reservations/recurring')
      .set(auth(token))
      .send({
        roomId: room.id,
        date: dateIn(1),
        startTime: '10:00',
        endTime: '11:00',
        title: 'Weekly sync',
        weeks: 4,
        ...body,
      });

  const book = (
    token: string,
    date: string,
    startTime: string,
    endTime: string,
  ) =>
    http()
      .post('/api/v1/reservations')
      .set(auth(token))
      .send({ roomId: room.id, date, startTime, endTime, title: 'One-off' })
      .expect(201);

  const count = () => ctx.db.getRepository(Reservation).count();

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    room = await createRoom(ctx.db);
    ana = (await loginAs(ctx, 'ana@demo.com')).token;
    bob = (await loginAs(ctx, 'bob@demo.com')).token;
  });
  afterAll(() => ctx.app.close());

  it('201: one reservation per week on the same weekday, sharing a seriesId', async () => {
    const res = await series(ana).expect(201);

    expect(res.body.seriesId).toEqual(expect.any(String));
    expect(res.body.reservations).toHaveLength(4);
    res.body.reservations.forEach(
      (r: { startsAt: string; seriesId: string }, i: number) => {
        // 10:00 in Buenos Aires (UTC-3, no DST) every week.
        expect(r.startsAt).toBe(`${dateIn(1 + 7 * i)}T13:00:00.000Z`);
        expect(r.seriesId).toBe(res.body.seriesId);
      },
    );
  });

  it('the occurrences appear in "my reservations" with their seriesId', async () => {
    const { body } = await series(ana).expect(201);
    const mine = await http()
      .get('/api/v1/reservations/me?scope=upcoming')
      .set(auth(ana))
      .expect(200);
    expect(mine.body.items).toHaveLength(4);
    expect(
      mine.body.items.every(
        (r: { seriesId: string }) => r.seriesId === body.seriesId,
      ),
    ).toBe(true);
  });

  it('409 and nothing is created when ONE occurrence clashes', async () => {
    await book(bob, dateIn(15), '10:30', '11:30');

    const res = await series(ana).expect(409);
    expect(res.body.error).toEqual({
      code: 'ROOM_OVERLAP',
      message: `No se creó ninguna reserva. La sala ya está ocupada el ${ddmmyyyy(dateIn(15))} de 10:30 a 11:30.`,
      details: [
        {
          field: dateIn(15),
          message: 'La sala ya está reservada de 10:30 a 11:30.',
        },
      ],
    });
    expect(await count()).toBe(1);
  });

  it('409 lists every clashing date', async () => {
    await book(bob, dateIn(8), '09:00', '10:30');
    await book(bob, dateIn(22), '10:45', '12:00');

    const res = await series(ana).expect(409);
    expect(
      res.body.error.details.map((d: { field: string }) => d.field),
    ).toEqual([dateIn(8), dateIn(22)]);
  });

  it('touching reservations do not clash (10:00–11:00 next to 09:00–10:00 and 11:00–12:00)', async () => {
    await book(bob, dateIn(8), '09:00', '10:00');
    await book(bob, dateIn(15), '11:00', '12:00');
    await series(ana).expect(201);
  });

  it('cancelled reservations do not block the series', async () => {
    const { body } = await book(bob, dateIn(8), '10:00', '11:00');
    await http()
      .post(`/api/v1/reservations/${body.id}/cancel`)
      .set(auth(bob))
      .expect(200);
    await series(ana).expect(201);
  });

  it('422: section 4 rules apply to the series (past start, duration)', async () => {
    const past = await series(ana, { date: dateIn(-1) }).expect(422);
    expect(past.body.error.code).toBe('IN_THE_PAST');

    const long = await series(ana, { endTime: '14:30' }).expect(422);
    expect(long.body.error.code).toBe('DURATION_OUT_OF_RANGE');

    const reversed = await series(ana, {
      startTime: '11:00',
      endTime: '10:00',
    }).expect(422);
    expect(reversed.body.error.code).toBe('END_BEFORE_START');
    expect(await count()).toBe(0);
  });

  it('422 when the room is inactive, 404 when it does not exist', async () => {
    const inactive = await createRoom(ctx.db, {
      name: 'Vieja',
      isActive: false,
    });
    const res = await series(ana, { roomId: inactive.id }).expect(422);
    expect(res.body.error.code).toBe('ROOM_INACTIVE');

    await series(ana, {
      roomId: '00000000-0000-4000-8000-000000000000',
    }).expect(404);
  });

  it.each([1, 13, 2.5, '4', undefined])('400 for weeks = %s', async (weeks) => {
    const res = await series(ana, { weeks }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('weeks');
  });

  it('concurrency: two series racing for the same week → one 201, one 409, no overlap', async () => {
    const [a, b] = await Promise.all([
      series(ana, { weeks: 3 }),
      series(bob, { date: dateIn(15), weeks: 2 }),
    ]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);

    const rows = await ctx.db.getRepository(Reservation).find();
    expect(rows).toHaveLength(a.status === 201 ? 3 : 2);
  });
});
