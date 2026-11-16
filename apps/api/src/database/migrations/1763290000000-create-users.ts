import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1763290000000 implements MigrationInterface {
  name = 'CreateUsers1763290000000';

  async up(q: QueryRunner) {
    await q.query(`CREATE TYPE user_role AS ENUM ('admin', 'member')`);
    await q.query(`
      CREATE TABLE users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name          varchar(80)  NOT NULL,
        email         varchar(254) NOT NULL,
        password_hash text         NOT NULL,
        role          user_role    NOT NULL DEFAULT 'member',
        created_at    timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT users_email_unique UNIQUE (email),
        CONSTRAINT users_email_lowercase CHECK (email = lower(email))
      )
    `);
  }

  async down(q: QueryRunner) {
    await q.query(`DROP TABLE users`);
    await q.query(`DROP TYPE user_role`);
  }
}
