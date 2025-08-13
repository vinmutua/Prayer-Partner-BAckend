import { Request, Response } from 'express';
import { prisma } from '../server';
import { sendSuccess, sendError } from '../utils/response.util';
import { ApiError, NotFoundError, BadRequestError } from '../utils/errors.util';
import logger from '../utils/logger.util';

// Get all prayer requests (admin only)
export const getAllPrayerRequests = async (req: Request, res: Response) => {
  try {
    const prayerRequests = await prisma.prayerRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, 200, 'Prayer requests retrieved successfully', prayerRequests);
  } catch (error) {
    logger.error('Get prayer requests error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    sendError(res, 500, 'Server error while fetching prayer requests',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Get active prayer requests (admin only)
export const getActivePrayerRequests = async (req: Request, res: Response) => {
  try {
    const prayerRequests = await prisma.prayerRequest.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, 200, 'Active prayer requests retrieved successfully', prayerRequests);
  } catch (error) {
    logger.error('Get active prayer requests error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    sendError(res, 500, 'Server error while fetching active prayer requests',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Get prayer requests for a specific user
export const getUserPrayerRequests = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId) || (req as any).user.id;

    const prayerRequests = await prisma.prayerRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, 200, 'User prayer requests retrieved successfully', prayerRequests);
  } catch (error) {
    logger.error('Get user prayer requests error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId || (req as any).user?.id
    });

    sendError(res, 500, 'Server error while fetching user prayer requests',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Get current active prayer request for a user
export const getCurrentPrayerRequest = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId) || (req as any).user.id;

    const prayerRequest = await prisma.prayerRequest.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!prayerRequest) {
      sendSuccess(res, 200, 'No active prayer request found', null);
      return;
    }

    sendSuccess(res, 200, 'Current prayer request retrieved successfully', prayerRequest);
  } catch (error) {
    logger.error('Get current prayer request error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId || (req as any).user?.id
    });

    sendError(res, 500, 'Server error while fetching current prayer request',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Create a new prayer request
export const createPrayerRequest = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const userId = (req as any).user.id;

    // Check if user already has an active prayer request
    const existingRequest = await prisma.prayerRequest.findFirst({
      where: {
        userId,
        isActive: true
      },
    });

    if (existingRequest) {
      // Deactivate the existing request
      await prisma.prayerRequest.update({
        where: { id: existingRequest.id },
        data: { isActive: false },
      });
    }

    // Create the new prayer request
    const newPrayerRequest = await prisma.prayerRequest.create({
      data: {
        content,
        userId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    sendSuccess(res, 201, 'Prayer request created successfully', newPrayerRequest);
  } catch (error) {
    logger.error('Create prayer request error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: (req as any).user?.id
    });

    sendError(res, 500, 'Server error while creating prayer request',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Update a prayer request (admin or owner)
export const updatePrayerRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, isActive } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Check if prayer request exists
    const prayerRequest = await prisma.prayerRequest.findUnique({
      where: { id: Number(id) },
    });

    if (!prayerRequest) {
      sendError(res, 404, 'Prayer request not found');
      return;
    }

    // Check if user is admin or the owner of the prayer request
    if (userRole !== 'ADMIN' && prayerRequest.userId !== userId) {
      sendError(res, 403, 'Not authorized to update this prayer request');
      return;
    }

    // Update the prayer request
    const updatedPrayerRequest = await prisma.prayerRequest.update({
      where: { id: Number(id) },
      data: {
        content: content !== undefined ? content : prayerRequest.content,
        isActive: isActive !== undefined ? isActive : prayerRequest.isActive,
      },
    });

    sendSuccess(res, 200, 'Prayer request updated successfully', updatedPrayerRequest);
  } catch (error) {
    logger.error('Update prayer request error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId: req.params.id,
      userId: (req as any).user?.id
    });

    sendError(res, 500, 'Server error while updating prayer request',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Delete a prayer request (admin or owner)
export const deletePrayerRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Check if prayer request exists
    const prayerRequest = await prisma.prayerRequest.findUnique({
      where: { id: Number(id) },
    });

    if (!prayerRequest) {
      sendError(res, 404, 'Prayer request not found');
      return;
    }

    // Check if user is admin or the owner of the prayer request
    if (userRole !== 'ADMIN' && prayerRequest.userId !== userId) {
      sendError(res, 403, 'Not authorized to delete this prayer request');
      return;
    }

    // Check if the prayer request is used in any pairings
    const pairingsWithRequest = await prisma.prayerPairing.findFirst({
      where: { requestId: Number(id) },
    });

    if (pairingsWithRequest) {
      // Instead of deleting, just deactivate
      await prisma.prayerRequest.update({
        where: { id: Number(id) },
        data: { isActive: false },
      });

      sendSuccess(res, 200, 'Prayer request is used in pairings. It has been deactivated instead of deleted.');
      return;
    }

    // Delete the prayer request
    await prisma.prayerRequest.delete({
      where: { id: Number(id) },
    });

    sendSuccess(res, 200, 'Prayer request deleted successfully');
  } catch (error) {
    logger.error('Delete prayer request error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId: req.params.id,
      userId: (req as any).user?.id
    });

    sendError(res, 500, 'Server error while deleting prayer request',
      error instanceof Error ? error.message : 'Unknown error');
  }
};
