import { CreateUsers1763290000000 } from './1763290000000-create-users.js';
import { CreateRooms1763290100000 } from './1763290100000-create-rooms.js';
import { CreateReservations1763290200000 } from './1763290200000-create-reservations.js';
import { AddReservationSeries1763290300000 } from './1763290300000-add-reservation-series.js';
import { AddUnaccent1763290400000 } from './1763290400000-add-unaccent.js';

/** Explicit, ordered list: works the same in dist (node) and in tests (vitest). */
export const migrations = [
  CreateUsers1763290000000,
  CreateRooms1763290100000,
  CreateReservations1763290200000,
  AddReservationSeries1763290300000,
  AddUnaccent1763290400000,
];
