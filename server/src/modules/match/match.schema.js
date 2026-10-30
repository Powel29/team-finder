import { z } from 'zod';

export const matchQuerySchema = {
  query: z.object({ roleId: z.string().min(1), userId: z.string().min(1).optional() }),
};
export const recommendMembersSchema = { query: z.object({ roleId: z.string().min(1) }) };
