import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env or reads the URL from schema.prisma.
try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the real environment (CI, Render)
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node prisma/seed.js' },
  // Migrations need a direct (non-pooled) connection: PgBouncer poolers cannot take advisory locks.
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
});
