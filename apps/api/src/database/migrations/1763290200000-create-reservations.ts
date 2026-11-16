import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reservations with the anti-overlap guarantee in the database (ADR-0003):
 * two concurrent requests can both pass the application check, but only one insert survives.
 */
export class CreateReservations1763290200000 implements MigrationInterface {
  name = 'CreateReservations1763290200000';

  async up(q: QueryRunner) {
    // Needed to combine `room_id WITH =` and `period WITH &&` in one GiST exclusion constraint.
    await q.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await q.query(
      `CREATE TYPE reservation_status AS ENUM ('active', 'cancelled')`,
    );
    await q.query(`
      CREATE TABLE reservations (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id      uuid NOT NULL REFERENCES rooms (id) ON DELETE RESTRICT,
        user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        title        varchar(120) NOT NULL,
        starts_at    timestamptz NOT NULL,
        ends_at      timestamptz NOT NULL,
        status       reservation_status NOT NULL DEFAULT 'active',
        cancelled_at timestamptz,
        created_at   timestamptz NOT NULL DEFAULT now(),
        -- '[)' = half-open: 10:00-11:00 and 11:00-12:00 do not overlap.
        period       tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
        CONSTRAINT reservations_end_after_start CHECK (ends_at > starts_at),
        CONSTRAINT reservations_duration CHECK (ends_at - starts_at BETWEEN interval '15 minutes' AND interval '4 hours'),
        CONSTRAINT reservations_cancelled_at CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
        -- The final guarantee: no two ACTIVE reservations of the same room may overlap.
        CONSTRAINT reservations_no_overlap EXCLUDE USING gist (room_id WITH =, period WITH &&) WHERE (status = 'active')
      )
    `);
    await q.query(
      `CREATE INDEX reservations_user_starts_idx ON reservations (user_id, starts_at)`,
    );
  }

  async down(q: QueryRunner) {
    await q.query(`DROP TABLE reservations`);
    await q.query(`DROP TYPE reservation_status`);
  }
}
