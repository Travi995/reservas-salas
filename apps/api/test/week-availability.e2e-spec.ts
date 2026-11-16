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

/** Monday of the ISO week containing `date`. */
function mondayOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

describe('Weekly availability (e2e)', () => {
  let ctx: TestContext;
  let token: string;
  let userId: string;
  let room: Room;
  // Next week, so every day is in the future and bookable.
  const someDay = dateIn(7);
  const monday = mondayOf(someDay);
  const http = () => request(ctx.app.getHttpServer());
  const week = (query: Record<string, string>) =>
    http()
      .get('/api/v1/availability/week')
      .query(query)
      .set('Authorization', `Bearer ${token}`);
  const book = (
    date: string,
    startTime: string,
    endTime: string,
    roomId = room.id,
  ) =>
    http()
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, date, startTime, endTime, title: startTime })
      .expect(201);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    const ana = await loginAs(ctx, 'ana@demo.com');
    token = ana.token;
    userId = ana.user.id;
    room = await createRoom(ctx.db);
  });
  afterAll(() => ctx.app.close());

  it('200: Monday to Sunday of the week containing the date, each slot on its local day', async () => {
    await book(someDay, '10:00', '11:00');
    // 23:00–23:45 in Buenos Aires is already the next day in UTC: it must stay on `someDay`.
    await book(someDay, '23:00', '23:45');

    const res = await week({ roomId: room.id, date: someDay }).expect(200);

    expect(res.body.weekStart).toBe(monday);
    expect(res.body.room).toMatchObject({ id: room.id, name: 'Sala Andes' });
    expect(res.body.days.map((d: { date: string }) => d.date)).toHaveLength(7);
    expect(res.body.days[0].date).toBe(monday);

    const day = res.body.days.find((d: { date: string }) => d.date === someDay);
    expect(day.reservations.map((r: { title: string }) => r.title)).toEqual([
      '10:00',
      '23:00',
    ]);
    expect(day.reservations[0]).toMatchObject({ userId, userName: 'ana' });

    const others = res.body.days.filter(
      (d: { date: string }) => d.date !== someDay,
    );
    expect(
      others.every(
        (d: { reservations: unknown[] }) => d.reservations.length === 0,
      ),
    ).toBe(true);
  });

  it('excludes cancelled reservations and other rooms', async () => {
    const other = await createRoom(ctx.db, { name: 'Otra' });
    await book(someDay, '09:00', '10:00', other.id);
    const { body } = await book(someDay, '12:00', '13:00');
    await http()
      .post(`/api/v1/reservations/${body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await week({ roomId: room.id, date: someDay }).expect(200);
    expect(
      res.body.days.flatMap((d: { reservations: unknown[] }) => d.reservations),
    ).toEqual([]);
  });

  it('an inactive room still shows its reservations', async () => {
    const old = await createRoom(ctx.db, { name: 'Vieja', isActive: false });
    await ctx.db.getRepository(Reservation).save({
      roomId: old.id,
      userId,
      title: 'Histórica',
      startsAt: new Date(`${monday}T13:00:00Z`),
      endsAt: new Date(`${monday}T14:00:00Z`),
    });

    const res = await week({ roomId: old.id, date: monday }).expect(200);
    expect(res.body.days[0].reservations).toHaveLength(1);
  });

  it('404 for an unknown room, 400 for invalid params, 401 without token', async () => {
    const notFound = await week({
      roomId: '00000000-0000-4000-8000-000000000000',
      date: someDay,
    }).expect(404);
    expect(notFound.body.error.code).toBe('ROOM_NOT_FOUND');

    const bad = await week({ roomId: 'nope', date: '2026-02-30' }).expect(400);
    expect(
      bad.body.error.details.map((d: { field: string }) => d.field).sort(),
    ).toEqual(['date', 'roomId']);

    await http()
      .get('/api/v1/availability/week')
      .query({ roomId: room.id, date: someDay })
      .expect(401);
  });
});
