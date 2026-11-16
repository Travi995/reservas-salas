import type { DataSourceOptions } from 'typeorm';
import type { Env } from '../config/env.validation.js';
import { migrations } from './migrations/index.js';

/** Postgres options shared by the app, the TypeORM CLI and the seed. Takes an already validated env. */
export function databaseOptions(
  env: Pick<Env, 'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME'>,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // Schema changes only through explicit migrations (ADR-0002 / ADR-0003).
    synchronize: false,
    migrations,
    // Starting the API brings the database up to date: one command to run the project.
    migrationsRun: true,
  };
}
