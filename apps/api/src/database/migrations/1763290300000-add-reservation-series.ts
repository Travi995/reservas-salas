import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Groups the occurrences of a recurring reservation; NULL for one-off reservations. */
export class AddReservationSeries1763290300000 implements MigrationInterface {
  name = 'AddReservationSeries1763290300000';

  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE reservations ADD COLUMN series_id uuid`);
    await q.query(
      `CREATE INDEX reservations_series_idx ON reservations (series_id) WHERE series_id IS NOT NULL`,
    );
  }

  async down(q: QueryRunner) {
    await q.query(`DROP INDEX reservations_series_idx`);
    await q.query(`ALTER TABLE reservations DROP COLUMN series_id`);
  }
}
