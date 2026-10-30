import { defineConfig } from 'vitest/config';

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://teamfinder:teamfinder@localhost:5432/teamfinder_test';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './src/tests/global-setup.js',
    // Tests truncate tables, so they share one database and must not run in parallel.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      REDIS_URL: '',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123',
    },
  },
});
