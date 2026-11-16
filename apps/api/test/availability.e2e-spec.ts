import request from 'supertest';
import type { Room } from '../src/modules/rooms/entities/room.entity.js';
import {
  createRoom,
  createTestApp,
  dateIn,
  loginAs,
  resetDb,
  type TestContext,
} from './utils/test-app.js';

describe('Availability (e2e)', () => {
  let ctx: TestContext;
  let token: string;
  let andes: Room;
  const tomorrow = dateIn(1);
  const http = () => request(ctx.app.getHttpServer());
  const get = (query: string) =>
    http()
      .get(`/api/v1/availability?${query}`)
      .set('Authorization', `Bearer ${token}`);
  const book = (
    roomId: string,
    startTime: string,
    endTime: string,
    date = tomorrow,
  ) =>
    http()
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, date, startTime, endTime, title: `${startTime}` })
      .expect(201);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    token = (await loginAs(ctx, 'ana@demo.com', undefined)).token;
    andes = await createRoom(ctx.db, { name: 'Andes', capacity: 8 });
    await createRoom(ctx.db, { name: 'Pampa', capacity: 4 });
    await createRoom(ctx.db, { name: 'Vieja', capacity: 20, isActive: false });
  });
  afterAll(() => ctx.app.close());

  it('lists active rooms with their busy slots for that day, sorted', async () => {
    await book(andes.id, '14:00', '15:00');
    await book(andes.id, '09:00', '10:00');
    await book(andes.id, '09:00', '10:00', dateIn(2)); // another day: not included

    const res = await get(`date=${tomorrow}`).expect(200);
    expect(res.body.date).toBe(tomorrow);
    expect(res.body.rooms.map((r: { room: Room }) => r.room.name)).toEqual([
      'Andes',
      'Pampa',
    ]);
    const [andesDay, pampaDay] = res.body.rooms;
    expect(
      andesDay.reservations.map((r: { title: string }) => r.title),
    ).toEqual(['09:00', '14:00']);
    expect(andesDay.reservations[0]).toMatchObject({
      userName: 'ana',
      userId: expect.any(String),
    });
    expect(pampaDay.reservations).toEqual([]);
  });

  it('filters by minimum capacity', async () => {
    const res = await get(`date=${tomorrow}&minCapacity=8`).expect(200);
    expect(res.body.rooms.map((r: { room: Room }) => r.room.name)).toEqual([
      'Andes',
    ]);
  });

  it('does not show cancelled reservations', async () => {
    const { body } = await book(andes.id, '09:00', '10:00');
    await http()
      .post(`/api/v1/reservations/${body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const res = await get(`date=${tomorrow}`).expect(200);
    expect(res.body.rooms[0].reservations).toEqual([]);
  });

  it('400 for an invalid date or capacity, 401 without token', async () => {
    await get('date=2026-13-01').expect(400);
    await get(`date=${tomorrow}&minCapacity=0`).expect(400);
    await http().get(`/api/v1/availability?date=${tomorrow}`).expect(401);
  });
});
