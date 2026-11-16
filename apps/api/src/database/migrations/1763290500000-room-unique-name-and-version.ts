import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rooms get a unique name (duplicates were indistinguishable when booking) and a `version`
 * counter for optimistic locking (two admins editing the same room).
 */
export class RoomUniqueNameAndVersion1763290500000 implements MigrationInterface {
  name = 'RoomUniqueNameAndVersion1763290500000';

  async up(q: QueryRunner) {
    // Existing duplicates keep the oldest name untouched; the others get " (2)", " (3)"…
    await q.query(`
      UPDATE rooms r
         SET name = left(r.name, 74) || ' (' || d.n || ')'
        FROM (
          SELECT id, row_number() OVER (PARTITION BY name ORDER BY created_at, id) AS n
            FROM rooms
        ) d
       WHERE d.id = r.id AND d.n > 1
    `);
    await q.query(
      `ALTER TABLE rooms ADD CONSTRAINT rooms_name_unique UNIQUE (name)`,
    );
    await q.query(
      `ALTER TABLE rooms ADD COLUMN version integer NOT NULL DEFAULT 1`,
    );
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE rooms DROP COLUMN version`);
    await q.query(`ALTER TABLE rooms DROP CONSTRAINT rooms_name_unique`);
  }
}
