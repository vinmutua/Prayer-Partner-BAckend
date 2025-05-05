import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export type ExpressHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void | Response> | void | Response;
