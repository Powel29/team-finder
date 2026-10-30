import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler = (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found'));

// Express identifies error handlers by their four-argument signature.
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body too large' } });
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}
