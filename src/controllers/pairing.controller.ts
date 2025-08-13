import { Request, Response } from 'express';
import { prisma } from '../server';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
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
      // If no pairings found as partner1, return empty array instead of error
      logger.debug('No pairings found for user as partner1', { userId });
      sendSuccess(res, 200, 'No current prayer partners found', []);
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
// DEPRECATED: Old bidirectional pairing system - use triggerMonthlyPairings instead
// This endpoint creates bidirectional pairings which violates the one-way principle
export const generatePairings = async (req: Request, res: Response) => {
  sendError(res, 410, 'This endpoint is deprecated. Use POST /pairings/generate-monthly for the new one-way circular system.');
  return;
  
  // Rest of the old code is commented out to prevent accidental use
  /*
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
  */
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
      return sendError(res, 401, 'User not authenticated');
    }

    // Get filter parameters from query
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const exportType = req.query.type as string || 'current'; // 'current', 'all', 'date-range'

    // Build filter conditions
    const whereCondition: any = {};
    
    if (exportType === 'current') {
      const currentDate = new Date();
      whereCondition.startDate = { lte: currentDate };
      whereCondition.endDate = { gte: currentDate };
    } else if (exportType === 'date-range') {
      if (startDate) {
        whereCondition.startDate = { gte: startDate };
      }
      if (endDate) {
        whereCondition.endDate = { lte: endDate };
      }
    }
    // For 'all', no additional filters are applied

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

    // Generate export metadata
    const exportDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const totalPairings = pairings.length;
    const specialPairings = pairings.filter(p => p.isSpecialPairing).length;
    const regularPairings = totalPairings - specialPairings;

    // Format data for CSV with enhanced structure
    const formattedData = pairings.map((pairing: PairingForExport, index) => ({
      'Pairing #': index + 1,
      'Pairing ID': pairing.id,
      'Start Date': pairing.startDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }),
      'End Date': pairing.endDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }),
      'Duration (Days)': 30, // Fixed 30-day prayer period
      'Prayer Warrior': `${pairing.partner1.firstName} ${pairing.partner1.lastName}`,
      'Prayer Warrior Email': pairing.partner1.email,
      'Praying For': `${pairing.partner2.firstName} ${pairing.partner2.lastName}`,
      'Partner Email': pairing.partner2.email,
      'Prayer Theme': pairing.theme.title,
      'Theme Description': pairing.theme.description?.substring(0, 100) + (pairing.theme.description?.length > 100 ? '...' : ''),
      'Partner\'s Prayer Request': pairing.partner2.prayerRequests.length > 0
        ? pairing.partner2.prayerRequests[0].content?.substring(0, 150) + (pairing.partner2.prayerRequests[0].content?.length > 150 ? '...' : '')
        : 'No active request',
      'Assigned Prayer Request': pairing.request 
        ? pairing.request.content?.substring(0, 150) + (pairing.request.content?.length > 150 ? '...' : '')
        : 'None assigned',
      'Special Pairing': pairing.isSpecialPairing ? 'Yes' : 'No',
      'Email Sent': pairing.emailSent ? 'Yes' : 'No',
      'Email Sent Date': pairing.emailSentAt 
        ? pairing.emailSentAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
        : 'Not sent',
      'Status': (() => {
        const now = new Date();
        if (now < pairing.startDate) return 'Upcoming';
        if (now > pairing.endDate) return 'Completed';
        return 'Active';
      })(),
    }));

    // Create summary header data
    const summaryData = [
      { 'Prayer Partner Export Summary': `Generated on: ${exportDate}` },
      { 'Prayer Partner Export Summary': `Export Type: ${exportType.charAt(0).toUpperCase() + exportType.slice(1).replace('-', ' ')}` },
      { 'Prayer Partner Export Summary': `Total Pairings: ${totalPairings}` },
      { 'Prayer Partner Export Summary': `Regular Pairings: ${regularPairings}` },
      { 'Prayer Partner Export Summary': `Special Pairings: ${specialPairings}` },
      { 'Prayer Partner Export Summary': startDate ? `Date Range: ${startDate.toLocaleDateString()} - ${endDate?.toLocaleDateString() || 'Present'}` : 'All dates included' },
      { 'Prayer Partner Export Summary': '' }, // Empty row for spacing
    ];

    // Generate CSV with summary
    const summaryFields = ['Prayer Partner Export Summary'];
    const dataFields = [
      'Pairing #',
      'Pairing ID',
      'Start Date',
      'End Date',
      'Duration (Days)',
      'Prayer Warrior',
      'Prayer Warrior Email',
      'Praying For',
      'Partner Email',
      'Prayer Theme',
      'Theme Description',
      'Partner\'s Prayer Request',
      'Assigned Prayer Request',
      'Special Pairing',
      'Email Sent',
      'Email Sent Date',
      'Status'
    ];

    const summaryParser = new Parser({ fields: summaryFields });
    const dataParser = new Parser({ fields: dataFields });
    
    const summaryCSV = summaryParser.parse(summaryData);
    const dataCSV = dataParser.parse(formattedData);
    
    const finalCSV = summaryCSV + '\n\n' + dataCSV;

    // Generate filename with timestamp and type
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `prayer-pairings-${exportType}-${timestamp}.csv`;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add BOM for proper UTF-8 encoding in Excel
    const bom = '\uFEFF';
    res.status(200).send(bom + finalCSV);
    
    logger.info('CSV export completed', {
      exportType,
      totalPairings,
      requestedBy: req.user.id,
      filename
    });
    
  } catch (error) {
    logger.error('Export pairings to CSV error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    sendError(res, 500, 'Server error while exporting pairings to CSV',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Export pairings to PDF
export const exportPairingsToPDF = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'User not authenticated');
    }

    // Get filter parameters from query
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const exportType = req.query.type as string || 'current';

    // Build filter conditions
    const whereCondition: any = {};
    
    if (exportType === 'current') {
      const currentDate = new Date();
      whereCondition.startDate = { lte: currentDate };
      whereCondition.endDate = { gte: currentDate };
    } else if (exportType === 'date-range') {
      if (startDate) {
        whereCondition.startDate = { gte: startDate };
      }
      if (endDate) {
        whereCondition.endDate = { lte: endDate };
      }
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

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: 'Prayer Partner Pairings Report',
        Author: 'Prayer Partner System',
        Subject: 'Prayer Pairings Export',
        Keywords: 'prayer, partners, pairings, report'
      }
    });

    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `prayer-pairings-${exportType}-${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate export metadata
    const exportDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const totalPairings = pairings.length;
    const specialPairings = pairings.filter(p => p.isSpecialPairing).length;
    const regularPairings = totalPairings - specialPairings;
    const activePairings = pairings.filter(p => {
      const now = new Date();
      return now >= p.startDate && now <= p.endDate;
    }).length;

    // Header with improved styling
    doc.fillColor('#2c3e50').fontSize(24).font('Helvetica-Bold')
       .text('Prayer Partner Pairings Report', { align: 'center' });
    doc.moveDown(0.3);
    
    // Add a decorative line
    doc.strokeColor('#3498db').lineWidth(2)
       .moveTo(150, doc.y).lineTo(450, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Subtitle with church/organization name
    doc.fillColor('#7f8c8d').fontSize(14).font('Helvetica')
       .text('Generated from Prayer Partner System', { align: 'center' });
    doc.moveDown(1.5);

    // Summary section with improved styling
    doc.fillColor('#2c3e50').fontSize(18).font('Helvetica-Bold')
       .text('📊 Report Summary', { underline: false });
    
    // Add background box for summary
    const summaryBoxY = doc.y + 5;
    doc.rect(40, summaryBoxY, 515, 120).fillAndStroke('#f8f9fa', '#e9ecef');
    
    doc.fillColor('#2c3e50').fontSize(12).font('Helvetica');
    const summaryStartY = summaryBoxY + 15;
    
    doc.text(`📅 Generated: ${exportDate}`, 50, summaryStartY);
    doc.text(`📋 Export Type: ${exportType.charAt(0).toUpperCase() + exportType.slice(1).replace('-', ' ')}`, 50, summaryStartY + 15);
    doc.text(`📊 Total Pairings: ${totalPairings}`, 50, summaryStartY + 30);
    doc.text(`🎯 Active Pairings: ${activePairings}`, 50, summaryStartY + 45);
    
    doc.text(`✅ Regular Pairings: ${regularPairings}`, 300, summaryStartY + 15);
    doc.text(`⭐ Special Pairings: ${specialPairings}`, 300, summaryStartY + 30);
    
    if (startDate || endDate) {
      const dateRange = startDate ? 
        `${startDate.toLocaleDateString()} - ${endDate?.toLocaleDateString() || 'Present'}` : 
        'All dates included';
      doc.text(`📅 Date Range: ${dateRange}`, 50, summaryStartY + 60);
    } else {
      doc.text(`📅 Date Range: All dates included`, 50, summaryStartY + 60);
    }
    
    doc.y = summaryBoxY + 130;
    doc.moveDown(1);

    // Statistics section with enhanced visuals
    if (totalPairings > 0) {
      doc.fillColor('#2c3e50').fontSize(18).font('Helvetica-Bold')
         .text('📈 Statistics & Insights', { underline: false });
      doc.moveDown(0.5);
      
      // Stats background box
      const statsBoxY = doc.y;
      doc.rect(40, statsBoxY, 515, 100).fillAndStroke('#e8f4fd', '#3498db');
      
      doc.fillColor('#2c3e50').fontSize(12).font('Helvetica');
      
      // Email sent statistics
      const emailsSent = pairings.filter(p => p.emailSent).length;
      const emailRate = totalPairings > 0 ? Math.round((emailsSent / totalPairings) * 100) : 0;
      doc.text(`📧 Notification Emails Sent: ${emailsSent} (${emailRate}%)`, 50, statsBoxY + 15);
      
      // Theme distribution
      const themeStats = pairings.reduce((acc, pairing) => {
        const themeName = pairing.theme.title;
        acc[themeName] = (acc[themeName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      doc.text('🎯 Prayer Themes Distribution:', 50, statsBoxY + 35);
      let themeY = statsBoxY + 50;
      Object.entries(themeStats).slice(0, 3).forEach(([theme, count]) => {
        const percentage = Math.round((count / totalPairings) * 100);
        doc.text(`   • ${theme}: ${count} pairings (${percentage}%)`, 60, themeY);
        themeY += 12;
      });
      
      doc.y = statsBoxY + 110;
      doc.moveDown(1);
    }

    // Pairings details header
    doc.fillColor('#2c3e50').fontSize(18).font('Helvetica-Bold')
       .text('🤝 Prayer Pairings Details', { underline: false });
    doc.moveDown(0.5);

    let yPosition = doc.y;
    
    pairings.forEach((pairing: PairingForExport, index) => {
      // Check if we need a new page
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      // Pairing card background
      const cardHeight = 140;
      doc.rect(40, yPosition, 515, cardHeight).fillAndStroke('#ffffff', '#d5d8dc');
      
      // Pairing header with number
      doc.fillColor('#2c3e50').fontSize(14).font('Helvetica-Bold');
      const pairingTitle = `${index + 1}. Prayer Partnership${pairing.isSpecialPairing ? ' ⭐ (Special)' : ''}`;
      doc.text(pairingTitle, 50, yPosition + 10);

      // Status badge with colors
      const now = new Date();
      let status = '🟢 Active';
      let statusColor = '#27ae60';
      
      if (now < pairing.startDate) {
        status = '🟡 Upcoming';
        statusColor = '#f39c12';
      } else if (now > pairing.endDate) {
        status = '🔴 Completed';
        statusColor = '#e74c3c';
      }

      doc.fillColor(statusColor).fontSize(10).font('Helvetica-Bold');
      doc.text(status, 450, yPosition + 12);

      // Dates with improved formatting
      const startDateStr = pairing.startDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
      const endDateStr = pairing.endDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
      const duration = 30; // Fixed 30-day prayer period
      
      doc.fillColor('#34495e').fontSize(11).font('Helvetica');
      doc.text(`📅 Period: ${startDateStr} to ${endDateStr} (${duration}-day prayer period)`, 50, yPosition + 30);

      // Prayer warrior and partner with icons
      doc.fillColor('#2c3e50').fontSize(11);
      doc.font('Helvetica-Bold').text('🙏 Prayer Warrior: ', 50, yPosition + 50, { continued: true });
      doc.font('Helvetica').text(`${pairing.partner1.firstName} ${pairing.partner1.lastName}`);
      doc.fontSize(9).fillColor('#7f8c8d').text(`${pairing.partner1.email}`, 50, yPosition + 65);

      doc.fillColor('#2c3e50').fontSize(11);
      doc.font('Helvetica-Bold').text('💝 Praying For: ', 280, yPosition + 50, { continued: true });
      doc.font('Helvetica').text(`${pairing.partner2.firstName} ${pairing.partner2.lastName}`);
      doc.fontSize(9).fillColor('#7f8c8d').text(`${pairing.partner2.email}`, 280, yPosition + 65);

      // Theme
      doc.fillColor('#2c3e50').fontSize(11);
      doc.font('Helvetica-Bold').text('🎯 Theme: ', 50, yPosition + 85, { continued: true });
      doc.font('Helvetica').fillColor('#8e44ad').text(pairing.theme.title);

      // Prayer request preview
      if (pairing.partner2.prayerRequests.length > 0) {
        const request = pairing.partner2.prayerRequests[0].content;
        const requestPreview = request && request.length > 80 ? request.substring(0, 80) + '...' : request;
        doc.fillColor('#2c3e50').fontSize(10);
        doc.font('Helvetica-Bold').text('🙏 Request: ', 50, yPosition + 105, { continued: true });
        doc.font('Helvetica').fillColor('#5d6d7e').text(`"${requestPreview || 'No request'}"`, { width: 400 });
      }

      // Email status with icon
      doc.fillColor('#2c3e50').fontSize(10).font('Helvetica');
      const emailStatus = pairing.emailSent 
        ? `✅ Email sent: ${pairing.emailSentAt?.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) || 'Unknown'}`
        : '❌ Email not sent';
      doc.text(emailStatus, 400, yPosition + 120);

      yPosition += cardHeight + 15;
    });

    // Enhanced footer with better styling
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer background
      doc.rect(40, 770, 515, 25).fillAndStroke('#f8f9fa', '#e9ecef');
      
      doc.fontSize(8).font('Helvetica').fillColor('#6c757d');
      doc.text(`📄 Page ${i + 1} of ${pageCount}`, 50, 778);
      doc.text(`📅 Generated: ${new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      })}`, 400, 778);
      doc.text('🙏 Prayer Partner System', 250, 778, { align: 'center' });
    }

    // Finalize PDF
    doc.end();

    logger.info('PDF export completed', {
      exportType,
      totalPairings,
      requestedBy: req.user.id,
      filename
    });

  } catch (error) {
    logger.error('Export pairings to PDF error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    sendError(res, 500, 'Server error while exporting pairings to PDF',
      error instanceof Error ? error.message : 'Unknown error');
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
        pairing.endDate,
        pairing.isSpecialPairing
      );

      // Send email to partner2
      const email2Result = await sendPrayerPartnerNotification(
        pairing.partner2.email,
        `${pairing.partner2.firstName} ${pairing.partner2.lastName}`,
        `${pairing.partner1.firstName} ${pairing.partner1.lastName}`,
        pairing.theme.title,
        pairing.theme.description,
        pairing.startDate,
        pairing.endDate,
        pairing.isSpecialPairing
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
        partner1Email: {
          email: pairing.partner1.email,
          success: email1Result.success,
          messageId: email1Result.messageId,
          error: email1Result.error,
        },
        partner2Email: {
          email: pairing.partner2.email,
          success: email2Result.success,
          messageId: email2Result.messageId,
          error: email2Result.error,
        },
      });
    }

    res.status(200).json({
      message: `Successfully sent ${emailResults.length * 2} emails to prayer partners (both partners in each pairing)`,
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

    // Send email to partner2
    const email2Result = await sendPrayerPartnerNotification(
      pairing.partner2.email,
      `${pairing.partner2.firstName} ${pairing.partner2.lastName}`,
      `${pairing.partner1.firstName} ${pairing.partner1.lastName}`,
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
      partner1Email: {
        success: email1Result.success,
        messageId: email1Result.messageId,
      },
      partner2Email: {
        success: email2Result.success,
        messageId: email2Result.messageId,
      },
    });
  } catch (error) {
    logger.error('Error sending email to pairing', { error, pairingId: req.params.id });
    sendError(res, 500, 'Server error while sending email',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Manual trigger for generating monthly one-way pairings
export const triggerMonthlyPairings = async (req: Request, res: Response) => {
  try {
    logger.info('Manual trigger for monthly pairing generation requested', { 
      requestedBy: req.user?.id 
    });

    // Import the pairing service
    const { generateMonthlyPairings } = await import('../services/pairing.service');
    
    // Generate the pairings
    const result = await generateMonthlyPairings();
    
    if (result.success) {
      logger.info('Manual pairing generation completed successfully', {
        count: result.count,
        pairingType: result.pairingType,
        requestedBy: req.user?.id
      });
      
      sendSuccess(res, 200, 'Monthly pairings generated successfully', {
        count: result.count,
        pairingType: result.pairingType || 'one-way-circular',
        message: result.message
      });
    } else {
      logger.error('Manual pairing generation failed', {
        error: result.error,
        message: result.message,
        requestedBy: req.user?.id
      });
      
      sendError(res, 400, result.message || 'Failed to generate pairings', 
        result.error instanceof Error ? result.error.message : String(result.error));
    }
  } catch (error) {
    logger.error('Error during manual pairing generation trigger', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestedBy: req.user?.id
    });
    
    sendError(res, 500, 'Server error while generating pairings',
      error instanceof Error ? error.message : 'Unknown error');
  }
};
