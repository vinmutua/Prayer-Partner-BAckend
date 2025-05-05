import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/errors.util';
import { sendError } from '../utils/response.util';
import logger from '../utils/logger.util';

/**
 * Global error handler middleware
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // We don't need to log here as we're using the errorLogger middleware

  // Handle known errors
  if (err instanceof ApiError) {
    return sendError(
      res,
      err.statusCode,
      err.message,
      err.stack
    );
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // Handle specific Prisma errors
    if ((err as any).code === 'P2002') {
      return sendError(
        res,
        409,
        'A record with this data already exists',
        err.message
      );
    }

    if ((err as any).code === 'P2025') {
      return sendError(
        res,
        404,
        'Record not found',
        err.message
      );
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return sendError(
      res,
      400,
      'Validation error',
      err.message
    );
  }

  // Handle unknown errors
  return sendError(
    res,
    500,
    'Internal server error',
    err.stack
  );
};
