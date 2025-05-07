import { Request, Response } from 'express';
import { prisma } from '../server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError } from '../utils/response.util';
import { ApiError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.util';
import { toNumber } from '../utils/type.util';

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

    sendSuccess(res, 201, 'User registered successfully', { user: userWithoutPassword });
  } catch (error) {
    console.error('Registration error:', error);

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
    console.error('Login error:', error);

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
    if (!req.user) { // Add this check
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
    console.error('Get user error:', error);

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while fetching user',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Admin: Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, 200, 'Users retrieved successfully', users);
  } catch (error) {
    console.error('Get all users error:', error);
    sendError(res, 500, 'Server error while fetching users',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Admin: Update user
export const updateUser = async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, 'User not authenticated');
  }
  const userIdToUpdate = toNumber(req.params.id);
  const loggedInUserId = toNumber(req.user.id);
  const loggedInUserRole = req.user.role;

  if (isNaN(userIdToUpdate)) {
    return sendError(res, 400, 'Invalid user ID.');
  }

  try {
    const { email, firstName, lastName, role, active } = req.body;

    if (userIdToUpdate === 0) {
      throw new BadRequestError('Invalid user ID');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userIdToUpdate },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userIdToUpdate },
      data: {
        email,
        firstName,
        lastName,
        role,
        active,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    sendSuccess(res, 200, 'User updated successfully', userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while updating user',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Admin: Delete user
export const deleteUser = async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, 'User not authenticated');
  }
  const userIdToDelete = toNumber(req.params.id);
  const loggedInUserId = toNumber(req.user.id);
  const loggedInUserRole = req.user.role;

  if (isNaN(userIdToDelete)) {
    return sendError(res, 400, 'Invalid user ID.');
  }

  try {
    if (userIdToDelete === 0) {
      throw new BadRequestError('Invalid user ID');
    }

    // First, check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userIdToDelete },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // First delete all prayer pairings associated with this user
    // This is needed because of foreign key constraints
    await prisma.prayerPairing.deleteMany({
      where: {
        OR: [
          { partner1Id: userIdToDelete },
          { partner2Id: userIdToDelete }
        ]
      }
    });

    // Now delete the user
    await prisma.user.delete({
      where: { id: userIdToDelete },
    });

    sendSuccess(res, 200, 'User deleted successfully');
  } catch (error) {
    console.error('Delete user error:', error);

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while deleting user',
      error instanceof Error ? error.message : 'Unknown error');
  }
};
