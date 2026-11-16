import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// apps/api/.env (el CLI se ejecuta desde apps/api).
config({ path: '.env', quiet: true });
import { User } from '../modules/users/entities/user.entity.js';
import { databaseOptions } from './database.config.js';

/** DataSource para el CLI de TypeORM (migration:run / revert) y el seed. */
export default new DataSource({ ...databaseOptions(), entities: [User] });
