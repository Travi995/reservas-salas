import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/utils/global-setup.ts'],
    // Dedicated DB for the tests: never touches development data.
    env: { DB_NAME: 'reservas_test' },
    // Test files share the DB: run serially so the TRUNCATEs don't clash.
    fileParallelism: false,
  },
});
