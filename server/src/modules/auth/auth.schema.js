import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email'));
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

export const registerSchema = {
  body: z.object({ name: z.string().trim().min(1, 'Name is required').max(80), email, password }),
};

export const loginSchema = {
  body: z.object({ email, password: z.string().min(1, 'Password is required').max(72) }),
};
