import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/utils/global-setup.ts'],
    // BD propia para los tests: nunca toca los datos de desarrollo.
    env: { DB_NAME: 'reservas_test' },
    // Los ficheros comparten la BD: en serie para que no se pisen los TRUNCATE.
    fileParallelism: false,
  },
});
