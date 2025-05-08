import { Request, Response } from 'express';
import { prisma } from '../server';
import { Parser } from 'json2csv';
import { sendPrayerPartnerNotification, sendReminderEmails as sendReminderEmailsCampaign } from '../services/email.service';
import { sendSuccess, sendError } from '../utils/response.util';
import { toNumber } from '../utils/type.util';
import { BadRequestError, NotFoundError } from '../utils/errors.util';
import logger from '../utils/logger.util';
import { Prisma, PrayerRequest } from '@prisma/client'; // Added Prisma and PrayerRequest

// Define complex types for Prisma payloads
type PairingForGetCurrentPartner = Prisma.PrayerPairingGetPayload<{
  include: {
    partner1: { select: { id: true, firstName: true, lastName: true, email: true } },
    partner2: { select: { id: true, firstName: true, lastName: true, email: true } },
    theme: true,
    request: true,
  }
}>;

type PairingForExport = Prisma.PrayerPairingGetPayload<{
  include: {
    partner1: {
      select: {
        firstName: true,
        lastName: true,
        email: true,
        prayerRequests: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    },
    partner2: {
      select: {
        firstName: true,
        lastName: true,
        email: true,
        prayerRequests: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    },
    theme: {
      select: {
        title: true,
        description: true,
      },
    },
    request: true,
  }
}>;

// Get all pairings
export const getAllPairings = async (req: Request, res: Response) => {
  try {
    const pairings = await prisma.prayerPairing.findMany({
      include: {
        partner1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        partner2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        theme: true,
        request: true,
      },
      orderBy: { startDate: 'desc' },
    });

    sendSuccess(res, 200, 'Pairings retrieved successfully', pairings);
  } catch (error) {
    logger.error('Get pairings error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    sendError(res, 500, 'Server error while fetching pairings',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Get current pairings (active based on date)
export const getCurrentPairings = async (req: Request, res: Response) => {
  try {
    const currentDate = new Date();
    logger.debug('Fetching current pairings', { date: currentDate });

    const pairings = await prisma.prayerPairing.findMany({
      where: {
        startDate: { lte: currentDate },
        endDate: { gte: currentDate },
      },
      include: {
        partner1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        partner2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        theme: true,
        request: true,
      },
      orderBy: { startDate: 'desc' },
    });

    logger.debug('Current pairings found', { count: pairings.length });
    sendSuccess(res, 200, 'Current pairings retrieved successfully', pairings);
  } catch (error) {
    logger.error('Get current pairings error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    sendError(res, 500, 'Server error while fetching current pairings',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Get pairing history for a specific user
export const getUserPairingHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'User not authenticated');
    }
    const userId = parseInt(req.params.userId) || req.user.id;

    const pairings = await prisma.prayerPairing.findMany({
      where: {
        OR: [
          { partner1Id: userId },
          { partner2Id: userId },
        ],
      },
      include: {
        partner1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        partner2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        theme: true,
        request: true,
      },
      orderBy: { startDate: 'desc' },
    });

    res.status(200).json(pairings);
    return;
  } catch (error) {
    console.error('Get user pairing history error:', error);
    res.status(500).json({ message: 'Server error while fetching user pairing history' });
    return;
  }
};

// Get current prayer partner for a user
export const getCurrentPartner = async (req: Request, res: Response) => {
  // Initialize userId with a default value before the try block
  let userId: number = -1; // Default value indicating uninitialized userId

  try {
    if (!req.user) {
      return sendError(res, 401, 'User not authenticated');
    }
    userId = toNumber(req.params.userId || req.user.id);
    const currentDate = new Date();

    // Find pairings where the user is partner1 (the one praying for someone)
    const pairings = await prisma.prayerPairing.findMany({
      where: {
        partner1Id: userId,
        startDate: { lte: currentDate },
        endDate: { gte: currentDate },
      },
      include: {
        partner1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        partner2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        theme: true,
        request: true,
      },
    });

    if (pairings.length === 0) {
      // If no pairings found as partner1, check if user is partner2
      logger.debug('No pairings found for user as partner1', { userId });
      sendError(res, 404, 'No current prayer partner found');
      return;
    }

    // Get the active prayer requests for each partner2
    const partnerIds = pairings.map((pairing: PairingForGetCurrentPartner) => pairing.partner2Id);

    const partnerRequests = await prisma.prayerRequest.findMany({
      where: {
        userId: { in: partnerIds },
        isActive: true,
      },
    });

    logger.debug('Active prayer requests found for partners', {
      count: partnerRequests.length,
      partnerIds
    });

    // Format the response
    const formattedPairings = pairings.map((pairing: PairingForGetCurrentPartner) => {
      // Find the active prayer request for this partner
      const partnerRequest = partnerRequests.find(
        (request: PrayerRequest) => request.userId === pairing.partner2Id
      );

      return {
        pairing: {
          id: pairing.id,
          startDate: pairing.startDate,
          endDate: pairing.endDate,
          theme: pairing.theme,
          isSpecialPairing: pairing.isSpecialPairing,
        },
        partner: pairing.partner2,
        prayerRequest: partnerRequest || pairing.request,
      };
    });

    sendSuccess(res, 200, 'Current prayer partner retrieved successfully', formattedPairings);
  } catch (error) {
    logger.error('Get current partner error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: userId !== -1 ? userId : 'unknown' // Use default value if uninitialized
    });
    sendError(res, 500, 'Server error while fetching current partner',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Create a new pairing manually
export const createPairing = async (req: Request, res: Response) => {
  try {
    const { partner1Id, partner2Id, themeId, startDate, endDate, requestId, isSpecialPairing } = req.body;

    // Validate that partners are different
    if (partner1Id === partner2Id) {
      res.status(400).json({ message: 'Partners must be different users' });
      return;
    }

    // Check if users exist and are active
    const partner1 = await prisma.user.findUnique({
      where: { id: partner1Id, active: true },
    });

    const partner2 = await prisma.user.findUnique({
      where: { id: partner2Id, active: true },
    });

    if (!partner1 || !partner2) {
      res.status(400).json({ message: 'One or both partners not found or inactive' });
      return;
    }

    // Check if theme exists
    const theme = await prisma.prayerTheme.findUnique({
      where: { id: themeId, active: true },
    });

    if (!theme) {
      res.status(400).json({ message: 'Theme not found or inactive' });
      return;
    }

    // Check if prayer request exists if provided
    if (requestId) {
      const prayerRequest = await prisma.prayerRequest.findUnique({
        where: { id: requestId },
      });

      if (!prayerRequest) {
        res.status(400).json({ message: 'Prayer request not found' });
        return;
      }
    }

    // Create the pairing
    const newPairing = await prisma.prayerPairing.create({
      data: {
        partner1Id,
        partner2Id,
        themeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        requestId: requestId || null,
        isSpecialPairing: isSpecialPairing || false,
      },
      include: {
        partner1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        partner2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        theme: true,
        request: true,
      },
    });

    res.status(201).json({
      message: 'Prayer pairing created successfully',
      pairing: newPairing,
    });
    return;
  } catch (error) {
    console.error('Create pairing error:', error);
    res.status(500).json({ message: 'Server error while creating pairing' });
    return;
  }
};

// Generate pairings for all active users
export const generatePairings = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, themeId } = req.body;

    // Convert themeId to number using the utility function
    const themeIdNumber = toNumber(themeId);

    if (themeIdNumber === 0) {
      throw new BadRequestError('Invalid theme ID format');
    }

    // Check if theme exists
    const theme = await prisma.prayerTheme.findUnique({
      where: { id: themeIdNumber, active: true },
    });

    if (!theme) {
      throw new NotFoundError('Prayer theme');
    }

    // First, clear any existing pairings that overlap with the new date range
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);

    logger.info('Clearing existing pairings that overlap with date range', {
      startDate: newStartDate,
      endDate: newEndDate
    });

    // Delete pairings that overlap with the new date range
    const deleteResult = await prisma.prayerPairing.deleteMany({
      where: {
        OR: [
          // Pairings that start during the new range
          {
            startDate: {
              gte: newStartDate,
              lte: newEndDate
            }
          },
          // Pairings that end during the new range
          {
            endDate: {
              gte: newStartDate,
              lte: newEndDate
            }
          },
          // Pairings that completely contain the new range
          {
            startDate: { lte: newStartDate },
            endDate: { gte: newEndDate }
          }
        ]
      }
    });

    logger.info('Cleared existing pairings', { count: deleteResult.count });

    // Get all active users with their active prayer requests
    const activeUsers = await prisma.user.findMany({
      where: { active: true },
      include: {
        prayerRequests: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (activeUsers.length < 2) {
      throw new BadRequestError('Not enough active users to create pairings');
    }

    // Shuffle users for random pairing
    const shuffledUsers = [...activeUsers].sort(() => Math.random() - 0.5);

    // Create pairings array to store all created pairings
    const pairings = [];

    // Handle odd number of members
    if (shuffledUsers.length % 2 !== 0) {
      // The last person will be paired with two others
      const specialUser = shuffledUsers.pop();

      if (!specialUser) {
        res.status(500).json({ message: 'Error handling odd number of users' });
        return;
      }

      // Create two special pairings for this user
      // First pairing: specialUser prays for the first user
      const firstPartner = shuffledUsers[0];

      // Get the prayer request for the first partner if it exists
      const firstPartnerRequestId = firstPartner.prayerRequests.length > 0
        ? firstPartner.prayerRequests[0].id
        : null;

      const firstPairing = await prisma.prayerPairing.create({
        data: {
          partner1Id: specialUser.id,
          partner2Id: firstPartner.id,
          themeId: themeIdNumber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isSpecialPairing: true,
          requestId: firstPartnerRequestId,
        },
      });

      pairings.push(firstPairing);

      // Second pairing: specialUser prays for the second user
      const secondPartner = shuffledUsers[1];

      // Get the prayer request for the second partner if it exists
      const secondPartnerRequestId = secondPartner.prayerRequests.length > 0
        ? secondPartner.prayerRequests[0].id
        : null;

      const secondPairing = await prisma.prayerPairing.create({
        data: {
          partner1Id: specialUser.id,
          partner2Id: secondPartner.id,
          themeId: themeIdNumber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isSpecialPairing: true,
          requestId: secondPartnerRequestId,
        },
      });

      pairings.push(secondPairing);
    }

    // Create regular pairings for the remaining users
    for (let i = 0; i < shuffledUsers.length; i += 2) {
      // If we're at the end with an odd number, we've already handled it
      if (i + 1 >= shuffledUsers.length) break;

      const partner1 = shuffledUsers[i];
      const partner2 = shuffledUsers[i + 1];

      // Get prayer requests for both partners if they exist
      const partner1RequestId = partner1.prayerRequests.length > 0
        ? partner1.prayerRequests[0].id
        : null;

      const partner2RequestId = partner2.prayerRequests.length > 0
        ? partner2.prayerRequests[0].id
        : null;

      // Create pairing where partner1 prays for partner2
      const pairing1 = await prisma.prayerPairing.create({
        data: {
          partner1Id: partner1.id,
          partner2Id: partner2.id,
          themeId: themeIdNumber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          requestId: partner2RequestId,
        },
      });

      pairings.push(pairing1);

      // Create pairing where partner2 prays for partner1
      const pairing2 = await prisma.prayerPairing.create({
        data: {
          partner1Id: partner2.id,
          partner2Id: partner1.id,
          themeId: themeIdNumber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          requestId: partner1RequestId,
        },
      });

      pairings.push(pairing2);
    }

    sendSuccess(res, 201, `Successfully cleared ${deleteResult.count} existing pairings and created ${pairings.length} new prayer pairings`, {
      clearedCount: deleteResult.count,
      createdCount: pairings.length,
      pairings: pairings.map(p => p.id)
    });
  } catch (error) {
    console.error('Generate pairings error:', error);

    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while generating pairings',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Delete a pairing
export const deletePairing = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'User not authenticated');
    }
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError('Pairing ID is required');
    }

    const pairingId = toNumber(id);

    if (pairingId === 0) {
      throw new BadRequestError('Invalid pairing ID format');
    }

    // Check if pairing exists
    const pairing = await prisma.prayerPairing.findUnique({
      where: { id: pairingId },
    });

    if (!pairing) {
      throw new NotFoundError('Prayer pairing');
    }

    await prisma.prayerPairing.delete({
      where: { id: pairingId },
    });

    sendSuccess(res, 200, 'Prayer pairing deleted successfully');
  } catch (error) {
    console.error('Delete pairing error:', error);

    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    sendError(res, 500, 'Server error while deleting pairing',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Export pairings to CSV
export const exportPairingsToCSV = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      // Or check for admin role if this is an admin-only endpoint
      return sendError(res, 401, 'User not authenticated');
    }
    // If this is an admin action, you might not need req.user.id directly here,
    // but the check for req.user (and potentially req.user.role === 'ADMIN') is still good.
    const userId = toNumber(req.params.userId || (req.user ? req.user.id : undefined));
    if (isNaN(userId) && !req.params.userId) { // If not getting all pairings and user ID is not from an authenticated user
        return sendError(res, 400, 'User ID is required to export pairings for a specific user.');
    }

    // Get filter parameters from query
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Build filter conditions
    const whereCondition: any = {};
    if (startDate) {
      whereCondition.startDate = { gte: startDate };
    }
    if (endDate) {
      whereCondition.endDate = { lte: endDate };
    }

    // Get pairings with filter
    const pairings = await prisma.prayerPairing.findMany({
      where: whereCondition,
      include: {
        partner1: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            prayerRequests: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        partner2: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            prayerRequests: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        theme: {
          select: {
            title: true,
            description: true,
          },
        },
        request: true,
      },
      orderBy: { startDate: 'desc' },
    });

    // Format data for CSV
    const formattedData = pairings.map((pairing: PairingForExport) => ({
      'Start Date': pairing.startDate.toLocaleDateString(),
      'End Date': pairing.endDate.toLocaleDateString(),
      'Partner 1 Name': `${pairing.partner1.firstName} ${pairing.partner1.lastName}`,
      'Partner 1 Email': pairing.partner1.email,
      'Partner 1 Prayer Request': pairing.partner1.prayerRequests.length > 0
        ? pairing.partner1.prayerRequests[0].content
        : 'None',
      'Partner 2 Name': `${pairing.partner2.firstName} ${pairing.partner2.lastName}`,
      'Partner 2 Email': pairing.partner2.email,
      'Partner 2 Prayer Request': pairing.partner2.prayerRequests.length > 0
        ? pairing.partner2.prayerRequests[0].content
        : 'None',
      'Prayer Theme': pairing.theme.title,
      'Theme Description': pairing.theme.description,
      'Special Pairing': pairing.isSpecialPairing ? 'Yes' : 'No',
      'Assigned Prayer Request': pairing.request ? pairing.request.content : 'None',
    }));

    // Generate CSV
    const fields = [
      'Start Date',
      'End Date',
      'Partner 1 Name',
      'Partner 1 Email',
      'Partner 1 Prayer Request',
      'Partner 2 Name',
      'Partner 2 Email',
      'Partner 2 Prayer Request',
      'Prayer Theme',
      'Theme Description',
      'Special Pairing',
      'Assigned Prayer Request'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formattedData);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=prayer-pairings.csv');

    // Send CSV data
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export pairings to CSV error:', error);
    res.status(500).json({ message: 'Server error while exporting pairings to CSV' });
  }
};

// Clear all current pairings
export const clearAllPairings = async (req: Request, res: Response) => {
  try {
    // Get current date
    const currentDate = new Date();
    console.log('Clearing all current pairings as of:', currentDate);

    // Find all current pairings
    const currentPairings = await prisma.prayerPairing.findMany({
      where: {
        startDate: { lte: currentDate },
        endDate: { gte: currentDate },
      },
    });

    console.log(`Found ${currentPairings.length} current pairings to clear`);

    if (currentPairings.length === 0) {
      sendError(res, 404, 'No current pairings found to clear');
      return;
    }

    // Delete all current pairings
    const deleteResult = await prisma.prayerPairing.deleteMany({
      where: {
        startDate: { lte: currentDate },
        endDate: { gte: currentDate },
      },
    });

    console.log(`Successfully cleared ${deleteResult.count} prayer pairings`);
    sendSuccess(res, 200, `Successfully cleared ${deleteResult.count} prayer pairings`, {
      count: deleteResult.count
    });
  } catch (error) {
    console.error('Clear all pairings error:', error);
    sendError(res, 500, 'Server error while clearing pairings',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Send emails to all paired partners
export const sendPartnerEmails = async (req: Request, res: Response) => {
  try {
    const { pairingIds } = req.body;

    // If specific pairingIds are provided, use them, otherwise get all current pairings
    const whereCondition: any = {};
    if (pairingIds && pairingIds.length > 0) {
      whereCondition.id = { in: pairingIds.map(Number) };
    } else {
      const currentDate = new Date();
      whereCondition.startDate = { lte: currentDate };
      whereCondition.endDate = { gte: currentDate };
    }

    // Get pairings
    const pairings = await prisma.prayerPairing.findMany({
      where: whereCondition,
      include: {
        partner1: true,
        partner2: true,
        theme: true,
      },
    });

    if (pairings.length === 0) {
      res.status(404).json({ message: 'No pairings found to send emails' });
      return;
    }

    // Send emails to all partners
    const emailResults = [];
    for (const pairing of pairings) {
      // Send email to partner1
      const email1Result = await sendPrayerPartnerNotification(
        pairing.partner1.email,
        `${pairing.partner1.firstName} ${pairing.partner1.lastName}`,
        `${pairing.partner2.firstName} ${pairing.partner2.lastName}`,
        pairing.theme.title,
        pairing.theme.description,
        pairing.startDate,
        pairing.endDate
      );

      // Update pairing with email sent status
      await prisma.prayerPairing.update({
        where: { id: pairing.id },
        data: {
          emailSent: true,
          emailSentAt: new Date(),
        },
      });

      emailResults.push({
        pairingId: pairing.id,
        partner1Email: pairing.partner1.email,
        success: email1Result.success,
        messageId: email1Result.messageId,
        error: email1Result.error,
      });
    }

    res.status(200).json({
      message: `Successfully sent ${emailResults.length} emails to prayer partners`,
      results: emailResults,
    });
  } catch (error) {
    console.error('Send partner emails error:', error);
    res.status(500).json({ message: 'Server error while sending partner emails' });
  }
};

// Send reminder emails to all users to submit prayer requests
export const sendReminderEmails = async (req: Request, res: Response) => {
  try {
    // Get all active users
    const activeUsers = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    if (activeUsers.length === 0) {
      sendError(res, 404, 'No active users found to send reminders');
      return;
    }

    // Get current pairings to find the end date
    const currentDate = new Date();
    const currentPairings = await prisma.prayerPairing.findMany({
      where: {
        startDate: { lte: currentDate },
        endDate: { gte: currentDate },
      },
      orderBy: { endDate: 'asc' },
      take: 1,
    });

    if (currentPairings.length === 0) {
      sendError(res, 404, 'No current pairings found to determine end date');
      return;
    }

    const endDate = currentPairings[0].endDate;

    // Send reminder emails using the email service
    const result = await sendReminderEmailsCampaign(activeUsers, endDate);

    if (result.success) {
      sendSuccess(res, 200, `Sent reminder emails to ${result.successCount} of ${result.totalCount} users`, {
        successCount: result.successCount,
        totalCount: result.totalCount,
        results: result.results
      });
    } else {
      sendError(res, 500, 'Failed to send reminder emails', result.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Send reminder emails error:', error);
    sendError(res, 500, 'Server error while sending reminder emails',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Send email to a specific pairing
export const sendEmailToPairing = async (req: Request, res: Response) => {
  try {
    const pairingId = toNumber(req.params.id);
    const { customMessage } = req.body;

    if (!pairingId) {
      sendError(res, 400, 'Invalid pairing ID');
      return;
    }

    // Get the pairing
    const pairing = await prisma.prayerPairing.findUnique({
      where: { id: pairingId },
      include: {
        partner1: true,
        partner2: true,
        theme: true,
      },
    });

    if (!pairing) {
      sendError(res, 404, 'Pairing not found');
      return;
    }

    // Send email to partner1
    const email1Result = await sendPrayerPartnerNotification(
      pairing.partner1.email,
      `${pairing.partner1.firstName} ${pairing.partner1.lastName}`,
      `${pairing.partner2.firstName} ${pairing.partner2.lastName}`,
      pairing.theme.title,
      pairing.theme.description,
      pairing.startDate,
      pairing.endDate,
      pairing.isSpecialPairing,
      customMessage
    );

    // Update pairing with email sent status
    await prisma.prayerPairing.update({
      where: { id: pairingId },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
      },
    });

    sendSuccess(res, 200, 'Email sent successfully', {
      pairingId,
      success: email1Result.success,
      messageId: email1Result.messageId,
    });
  } catch (error) {
    logger.error('Error sending email to pairing', { error, pairingId: req.params.id });
    sendError(res, 500, 'Server error while sending email',
      error instanceof Error ? error.message : 'Unknown error');
  }
};
