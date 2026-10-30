export class AppError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} code machine readable code
   * @param {string} message human readable message
   * @param {Array<{path: string, message: string}>} [details]
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const forbidden = (message = 'You are not allowed to do that') => new AppError(403, 'FORBIDDEN', message);
export const conflict = (code, message) => new AppError(409, code, message);
