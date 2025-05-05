import { Request, Response } from 'express';
import { prisma } from '../server';
import { sendSuccess, sendError } from '../utils/response.util';
import { ApiError, NotFoundError, BadRequestError } from '../utils/errors.util';
import { toNumber } from '../utils/type.util';

// Get all prayer themes
export const getAllThemes = async (req: Request, res: Response) => {
  try {
    const themes = await prisma.prayerTheme.findMany({
      orderBy: { title: 'asc' },
    });

    sendSuccess(res, 200, 'Themes retrieved successfully', themes);
  } catch (error) {
    console.error('Get themes error:', error);
    sendError(res, 500, 'Server error while fetching themes',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Get active prayer themes
export const getActiveThemes = async (req: Request, res: Response) => {
  try {
    const themes = await prisma.prayerTheme.findMany({
      where: { active: true },
      orderBy: { title: 'asc' },
    });

    sendSuccess(res, 200, 'Active themes retrieved successfully', themes);
  } catch (error) {
    console.error('Get active themes error:', error);
    sendError(res, 500, 'Server error while fetching active themes',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Get a single prayer theme by ID
export const getThemeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const themeId = toNumber(id);

    if (themeId === 0) {
      throw new BadRequestError('Invalid theme ID');
    }

    const theme = await prisma.prayerTheme.findUnique({
      where: { id: themeId },
    });

    if (!theme) {
      throw new NotFoundError('Prayer theme');
    }

    sendSuccess(res, 200, 'Theme retrieved successfully', theme);
  } catch (error) {
    console.error('Get theme by ID error:', error);

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while fetching theme',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Create a new prayer theme
export const createTheme = async (req: Request, res: Response) => {
  try {
    const { title, description, active } = req.body;

    if (!title) {
      throw new BadRequestError('Title is required');
    }

    const newTheme = await prisma.prayerTheme.create({
      data: {
        title,
        description,
        active: active !== undefined ? active : true,
      },
    });

    sendSuccess(res, 201, 'Prayer theme created successfully', newTheme);
  } catch (error) {
    console.error('Create theme error:', error);

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while creating theme',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Update a prayer theme
export const updateTheme = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, active } = req.body;

    const themeId = toNumber(id);
    if (themeId === 0) {
      throw new BadRequestError('Invalid theme ID');
    }

    // Check if theme exists
    const existingTheme = await prisma.prayerTheme.findUnique({
      where: { id: themeId },
    });

    if (!existingTheme) {
      throw new NotFoundError('Prayer theme');
    }

    const updatedTheme = await prisma.prayerTheme.update({
      where: { id: themeId },
      data: {
        title,
        description,
        active,
      },
    });

    sendSuccess(res, 200, 'Prayer theme updated successfully', updatedTheme);
  } catch (error) {
    console.error('Update theme error:', error);

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while updating theme',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Delete a prayer theme
export const deleteTheme = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const themeId = toNumber(id);

    if (themeId === 0) {
      throw new BadRequestError('Invalid theme ID');
    }

    // Check if theme exists
    const existingTheme = await prisma.prayerTheme.findUnique({
      where: { id: themeId },
    });

    if (!existingTheme) {
      throw new NotFoundError('Prayer theme');
    }

    // Check if theme is used in any pairings
    const pairingsWithTheme = await prisma.prayerPairing.findFirst({
      where: { themeId: themeId },
    });

    if (pairingsWithTheme) {
      throw new BadRequestError('Cannot delete theme that is used in pairings. Consider deactivating it instead.');
    }

    await prisma.prayerTheme.delete({
      where: { id: themeId },
    });

    sendSuccess(res, 200, 'Prayer theme deleted successfully');
  } catch (error) {
    console.error('Delete theme error:', error);

    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while deleting theme',
      error instanceof Error ? error.message : 'Unknown error');
  }
};
