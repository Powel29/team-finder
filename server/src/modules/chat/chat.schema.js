import { z } from 'zod';

export const messageBody = z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Max 2000 characters');

export const historySchema = {
  params: z.object({ id: z.string().min(1) }),
  query: z.object({ before: z.string().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }),
};
export const postMessageSchema = { params: z.object({ id: z.string().min(1) }), body: z.object({ body: messageBody }) };
export const socketSendSchema = z.object({
  teamId: z.string().min(1),
  body: messageBody,
  clientId: z.string().max(64).optional(),
});
export const socketTeamSchema = z.object({ teamId: z.string().min(1) });
