import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/utils/global-setup.ts'],
    // Dedicated DB for the tests: never touches development data.
    // The suite logs in hundreds of times from one IP: the auth rate limit has its own spec.
    env: { DB_NAME: 'reservas_test', AUTH_RATE_LIMIT: '100000' },
    // Test files share the DB: run serially so the TRUNCATEs don't clash.
    fileParallelism: false,
  },
});
