import { AppError } from '../lib/errors.js';

/**
 * Validates request parts with Zod. Parsed values land on `req.valid` because
 * Express 5 makes `req.query` read-only.
 * @param {{ body?: import('zod').ZodType, query?: import('zod').ZodType, params?: import('zod').ZodType }} schemas
 */
export const validate = (schemas) => (req, _res, next) => {
  const details = [];
  req.valid = {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) {
      req.valid[part] = result.data;
    } else {
      for (const issue of result.error.issues) {
        details.push({ path: issue.path.join('.'), message: issue.message });
      }
    }
  }
  if (details.length) return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid input', details));
  next();
};
