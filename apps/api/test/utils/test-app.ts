import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { User } from '../../src/modules/users/entities/user.entity.js';
import { Role } from '../../src/modules/users/enums/role.enum.js';

export interface TestContext {
  app: INestApplication<App>;
  db: DataSource;
}

/** Boots the real app (same pipes, filters and guards as in production) against the test DB. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = configureApp(
    moduleRef.createNestApplication(),
  ) as INestApplication<App>;
  await app.init();
  return { app, db: app.get(DataSource) };
}

/** Empties all data tables between tests. */
export async function resetDb(db: DataSource) {
  const tables = db.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
  await db.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export async function createUser(
  db: DataSource,
  data: { email: string; password: string; role?: Role; name?: string },
) {
  return db.getRepository(User).save({
    name: data.name ?? data.email.split('@')[0],
    email: data.email,
    role: data.role ?? Role.Member,
    passwordHash: await hash(data.password),
  });
}

/** Creates a user and returns their token. */
export async function loginAs(
  ctx: TestContext,
  email: string,
  role: Role = Role.Member,
) {
  const user = await createUser(ctx.db, {
    email,
    password: 'password123',
    role,
  });
  const res = await request(ctx.app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  return { user, token: res.body.accessToken as string };
}
