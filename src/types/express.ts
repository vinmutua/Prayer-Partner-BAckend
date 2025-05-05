import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export type ExpressHandler = (
  req: Request<ParamsDictionary, any, any, ParsedQs>,
  res: Response,
  next?: NextFunction
) => Promise<void | Response> | void | Response;

// Add custom property to Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      role: string;
    };
  }
}
