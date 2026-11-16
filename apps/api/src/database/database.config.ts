import type { DataSourceOptions } from 'typeorm';
import { migrations } from './migrations/index.js';

/** Opciones de Postgres compartidas por la app, el CLI de TypeORM y el seed. */
export function databaseOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5440),
    username: env.DB_USER ?? 'reservas',
    password: env.DB_PASSWORD ?? 'reservas',
    database: env.DB_NAME ?? 'reservas',
    // Esquema solo mediante migraciones explícitas (ADR-0002 / ADR-0003).
    synchronize: false,
    migrations,
    // Arrancar la API deja la BD al día: un solo comando para levantar el proyecto.
    migrationsRun: true,
  };
}
