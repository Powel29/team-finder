import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const listNotificationsSchema = {
  query: z.object({
    unread: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    ...paginationSchema,
    pageSize: paginationSchema.pageSize.default(20),
  }),
};
export const notificationParams = { params: z.object({ id: z.string().min(1) }) };
