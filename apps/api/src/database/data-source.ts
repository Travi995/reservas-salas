import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation.js';
import { Reservation } from '../modules/reservations/entities/reservation.entity.js';
import { Room } from '../modules/rooms/entities/room.entity.js';
import { User } from '../modules/users/entities/user.entity.js';
import { databaseOptions } from './database.config.js';

// apps/api/.env (the CLI runs from apps/api). Same validation as the app.
config({ path: '.env', quiet: true });

/** DataSource for the TypeORM CLI (migration:run / revert) and the seed. */
export default new DataSource({
  ...databaseOptions(validateEnv(process.env)),
  entities: [User, Room, Reservation],
});
