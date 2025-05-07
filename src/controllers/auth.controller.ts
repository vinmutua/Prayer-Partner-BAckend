import { Request, Response } from 'express';
import { prisma } from '../server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError } from '../utils/response.util';
import { ApiError, NotFoundError, UnauthorizedError, BadRequestError, ForbiddenError } from '../utils/errors.util';
import { toNumber } from '../utils/type.util';
import logger from '../utils/logger.util';
import { sendWelcomeEmail } from '../services/email.service';

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError('User already exists with this email');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'MEMBER', // Default role
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    // Send welcome email
    try {
      await sendWelcomeEmail(
        newUser.email,
        `${newUser.firstName} ${newUser.lastName}`
      );
      logger.info('Welcome email sent successfully', { userId: newUser.id, email: newUser.email });
    } catch (emailError) {
      // Log the error but don't fail the registration
      logger.error('Failed to send welcome email', {
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        userId: newUser.id,
        email: newUser.email
      });
    }

    sendSuccess(res, 201, 'User registered successfully', { user: userWithoutPassword });
  } catch (error) {
    logger.error('Registration error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      email: req.body.email
    });

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error during registration',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestError('Invalid email or password');
    }

    // Check if user is active
    if (!user.active) {
      throw new ForbiddenError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestError('Invalid email or password');
    }

    // Generate access token with shorter expiration
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    // Generate refresh token with longer expiration
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    sendSuccess(res, 200, 'Login successful', {
      user: userWithoutPassword,
      token,
      refreshToken
    });
  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      email: req.body.email
    });

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error during login',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Get current user profile
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'User not authenticated');
    }
    const userId = toNumber(req.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    sendSuccess(res, 200, 'User profile retrieved successfully', userWithoutPassword);
  } catch (error) {
    logger.error('Get user error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id
    });

    if (error instanceof NotFoundError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while fetching user',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as any;

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: toNumber(decoded.userId), active: true },
      });

      if (!user) {
        throw new ForbiddenError('Invalid token or user not active');
      }

      // Generate new access token
      const newToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' }  // Shorter expiration for access token
      );

      // Generate new refresh token
      const newRefreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' }  // Longer expiration for refresh token
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      sendSuccess(res, 200, 'Token refreshed successfully', {
        user: userWithoutPassword,
        token: newToken,
        refreshToken: newRefreshToken
      });
    } catch (jwtError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  } catch (error) {
    logger.error('Token refresh error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 403, 'Invalid refresh token',
      error instanceof Error ? error.message : 'Unknown error');
  }
};
