import { z } from 'zod';

const emptyToUndefined = (v) => (v === '' ? undefined : v);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional()),
  SERVE_CLIENT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

/** Parses and validates process.env, failing fast with a readable message. */
export function loadEnv(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  const env = result.data;
  return {
    ...env,
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    clientOrigins: env.CLIENT_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}

export const env = loadEnv();
