import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Who cancelled a reservation (the owner or an admin). NULL for active ones and for cancellations made before this column. */
export class AddReservationCancelledBy1763290600000 implements MigrationInterface {
  name = 'AddReservationCancelledBy1763290600000';

  async up(q: QueryRunner) {
    await q.query(
      `ALTER TABLE reservations ADD COLUMN cancelled_by uuid REFERENCES users (id) ON DELETE SET NULL`,
    );
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE reservations DROP COLUMN cancelled_by`);
  }
}
