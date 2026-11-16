import { hash } from 'argon2';
import { User } from '../modules/users/entities/user.entity.js';
import { Role } from '../modules/users/enums/role.enum.js';
import dataSource from './data-source.js';

/** Usuarios de prueba (documentados en el README). Idempotente: no duplica si ya existen. */
const DEMO_USERS = [
  {
    name: 'Admin Demo',
    email: 'admin@demo.com',
    password: 'Admin1234!',
    role: Role.Admin,
  },
  {
    name: 'Member Demo',
    email: 'member@demo.com',
    password: 'Member1234!',
    role: Role.Member,
  },
];

async function seed() {
  await dataSource.initialize();
  await dataSource.runMigrations();
  const repo = dataSource.getRepository(User);
  for (const u of DEMO_USERS) {
    if (await repo.existsBy({ email: u.email })) continue;
    await repo.insert({
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: await hash(u.password),
    });
    console.log(`Usuario creado: ${u.email} (${u.role})`);
  }
  await dataSource.destroy();
}

await seed();
