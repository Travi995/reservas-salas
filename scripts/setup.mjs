// First-time setup: creates apps/*/.env from the examples (with a random JWT secret) if missing.
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

for (const app of ['api', 'web']) {
  const env = `apps/${app}/.env`;
  if (existsSync(env)) {
    console.log(`${env} already exists, keeping it`);
    continue;
  }
  copyFileSync(`apps/${app}/.env.example`, env);
  if (app === 'api') {
    const secret = randomBytes(48).toString('base64url');
    writeFileSync(env, readFileSync(env, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`));
  }
  console.log(`created ${env}`);
}
