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
  datasource: { url: process.env.DATABASE_URL },
});
