import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { BadRequestError } from '../utils/errors.util';
import { toNumber } from '../utils/type.util';

// Validation rules for different routes
export const registerValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const prayerRequestValidation = [
  body('content').notEmpty().withMessage('Prayer request content is required')
    .isLength({ max: 1000 }).withMessage('Prayer request content must not exceed 1000 characters'),
];

export const themeValidation = [
  body('title').notEmpty().withMessage('Theme title is required')
    .isLength({ max: 100 }).withMessage('Theme title must not exceed 100 characters'),
  body('description').notEmpty().withMessage('Theme description is required')
    .isLength({ max: 500 }).withMessage('Theme description must not exceed 500 characters'),
  body('active').isBoolean().withMessage('Active status must be a boolean'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
];

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

// Middleware to validate request
export const validate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map(err => ({
        field: (err as any).param || 'unknown',
        message: err.msg
      }));

      throw new BadRequestError(
        `Validation error: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validatePairingRequest = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, themeId } = req.body;

    if (!startDate || !endDate || !themeId) {
      throw new BadRequestError('Missing required fields: startDate, endDate, and themeId are required');
    }

    // Convert themeId to number
    req.body.themeId = toNumber(themeId);

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError('Invalid date format');
    }

    if (start >= end) {
      throw new BadRequestError('Start date must be before end date');
    }

    next();
  } catch (error) {
    next(error);
  }
};
