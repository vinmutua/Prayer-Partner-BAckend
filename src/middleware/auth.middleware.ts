import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.util';
import { toNumber } from '../utils/type.util';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to verify JWT token
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for token in authorization header
    const authHeader = req.headers['authorization'];
    // Check for token in query parameter (for CSV export)
    const queryToken = req.query.token as string;

    // Get token from either source
    const token = (authHeader && authHeader.split(' ')[1]) || queryToken;

    if (!token) {
      throw new UnauthorizedError('Access denied. No token provided.');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: toNumber(decoded.userId), active: true },
      });

      if (!user) {
        throw new ForbiddenError('Invalid token or user not active.');
      }

      req.user = user;
      next();
    } catch (jwtError) {
      throw new UnauthorizedError('Invalid token.');
    }
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user is admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user && req.user.role === 'ADMIN') {
      next();
    } else {
      throw new ForbiddenError('Access denied. Admin role required.');
    }
  } catch (error) {
    next(error);
  }
};
