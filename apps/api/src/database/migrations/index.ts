import { CreateUsers1763290000000 } from './1763290000000-create-users.js';
import { CreateRooms1763290100000 } from './1763290100000-create-rooms.js';

/** Explicit, ordered list: works the same in dist (node) and in tests (vitest). */
export const migrations = [CreateUsers1763290000000, CreateRooms1763290100000];
