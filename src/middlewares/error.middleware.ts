import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  if (statusCode === 500) {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      details: err.details || null,
    },
  });
}
