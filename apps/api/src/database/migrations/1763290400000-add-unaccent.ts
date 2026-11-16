import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Accent-insensitive search in the admin listing: "reunion" matches "Reunión". */
export class AddUnaccent1763290400000 implements MigrationInterface {
  name = 'AddUnaccent1763290400000';

  async up(q: QueryRunner) {
    await q.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  async down(q: QueryRunner) {
    await q.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
