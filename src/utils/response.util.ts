import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  statusCode: number;
  error?: string;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T,
  error?: string
): void => {
  res.status(statusCode).json({
    success,
    message,
    data,
    statusCode,
    error: process.env.NODE_ENV === 'development' ? error : undefined
  });
};

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): void => {
  sendResponse(res, statusCode, true, message, data);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: string
): void => {
  sendResponse(res, statusCode, false, message, undefined, error);
};
