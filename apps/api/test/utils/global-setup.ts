import { config } from 'dotenv';
import pg from 'pg';

/** Crea la base de datos de test si no existe (las migraciones las corre la propia app al arrancar). */
export default async function setup() {
  config({ path: '.env', quiet: true });
  const client = new pg.Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5440),
    user: process.env.DB_USER ?? 'reservas',
    password: process.env.DB_PASSWORD ?? 'reservas',
    database: 'postgres',
  });
  await client.connect();
  const name = process.env.DB_TEST_NAME ?? 'reservas_test';
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [name],
  );
  if (!rowCount) await client.query(`CREATE DATABASE "${name}"`);
  await client.end();
}
