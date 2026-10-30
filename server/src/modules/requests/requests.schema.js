import { z } from 'zod';
import { csv, paginationSchema } from '../../lib/pagination.js';

const id = z.string().min(1);
const message = z.string().trim().max(500, 'Max 500 characters').default('');

export const joinSchema = { body: z.object({ teamId: id, roleId: id, message }) };
export const inviteSchema = { body: z.object({ teamId: id, roleId: id, userId: id, message }) };
export const requestParams = { params: z.object({ id }) };

export const listRequestsSchema = {
  query: z.object({
    box: z.enum(['received', 'sent', 'all']).default('all'),
    status: csv.pipe(z.array(z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED']))),
    teamId: id.optional(),
    ...paginationSchema,
    pageSize: paginationSchema.pageSize.default(20),
  }),
};
