import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRooms1763290100000 implements MigrationInterface {
  name = 'CreateRooms1763290100000';

  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE rooms (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name       varchar(80)  NOT NULL,
        capacity   integer      NOT NULL,
        location   varchar(120) NOT NULL,
        time_zone  varchar(64)  NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
        is_active  boolean      NOT NULL DEFAULT true,
        created_at timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT rooms_capacity_positive CHECK (capacity > 0)
      )
    `);
    // Availability filters active rooms by minimum capacity.
    await q.query(
      `CREATE INDEX rooms_active_capacity_idx ON rooms (capacity) WHERE is_active`,
    );
  }

  async down(q: QueryRunner) {
    await q.query(`DROP TABLE rooms`);
  }
}
