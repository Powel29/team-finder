import { z } from 'zod';

export const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
};

export const MATCH_SORT_CAP = 300;

export const buildPage = (items, page, pageSize, total) => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

export const slicePage = (all, page, pageSize) =>
  buildPage(all.slice((page - 1) * pageSize, page * pageSize), page, pageSize, all.length);

/** Zod helper: "a,b,c" -> ["a","b","c"]. */
export const csv = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );
