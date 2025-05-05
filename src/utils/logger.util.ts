import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.context ? ` ${JSON.stringify(info.context)}` : ''}${info.stack ? `\n${info.stack}` : ''}`
  )
);

// Create the logger
const logger = winston.createLogger({
  level,
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.json()
  ),
  transports: [
    // Console transport for all logs
    new winston.transports.Console({ format: consoleFormat }),
    
    // File transport for error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.json()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.json()
      )
    }),
  ],
});

// Create a request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate a unique ID for this request
  req.id = uuidv4();
  
  // Log the request
  logger.http(`${req.method} ${req.url}`, { 
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id
  });
  
  // Log the response
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
      requestId: req.id,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.id
    });
  });
  
  next();
};

// Error logger middleware
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`${err.message || 'Unknown error'}`, {
    requestId: req.id,
    context: {
      method: req.method,
      url: req.url,
      userId: (req as any).user?.id
    },
    stack: err.stack
  });
  
  next(err);
};

// Extend the Request interface to include the id property
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// Export the logger
export default logger;
