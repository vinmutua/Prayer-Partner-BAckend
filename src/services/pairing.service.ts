import { prisma } from '../server';
import { sendPrayerPartnerNotification } from './email.service';

// Generate pairings for all active users
export const generateWeeklyPairings = async () => {
  try {
    console.log('Starting weekly pairing generation...');

    // Get all active users including admins
    const activeUsers = await prisma.user.findMany({
      where: {
        active: true
        // Admins are now included in pairings
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });

    if (activeUsers.length < 2) {
      console.log('Not enough active users to create pairings');
      return { success: false, message: 'Not enough active users' };
    }

    // Get a random active theme
    const randomTheme = await prisma.prayerTheme.findFirst({
      where: { active: true },
      orderBy: { id: 'desc' }, // Use a different theme each time
    });

    if (!randomTheme) {
      console.log('No active themes found');
      return { success: false, message: 'No active themes found' };
    }

    // Calculate start and end dates (start today, end in 7 days)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    // Shuffle users for random pairing
    const shuffledUsers = [...activeUsers].sort(() => Math.random() - 0.5);

    // Create pairings and send notifications
    const pairings = [];
    const emailPromises = [];

    // Handle odd number of users with special triangle pairing
    if (shuffledUsers.length % 2 !== 0) {
      // Take the first three users for the triangle pairing
      const specialUser = shuffledUsers[0]; // This user will pray for two others
      const partner1 = shuffledUsers[1];
      const partner2 = shuffledUsers[2];

      // Create the special pairings:
      // 1. specialUser prays for partner1
      const pairing1 = await prisma.prayerPairing.create({
        data: {
          partner1Id: specialUser.id,
          partner2Id: partner1.id,
          themeId: randomTheme.id,
          startDate,
          endDate,
        },
      });
      pairings.push(pairing1);

      // 2. specialUser prays for partner2
      const pairing2 = await prisma.prayerPairing.create({
        data: {
          partner1Id: specialUser.id,
          partner2Id: partner2.id,
          themeId: randomTheme.id,
          startDate,
          endDate,
        },
      });
      pairings.push(pairing2);

      // 3. partner1 prays for specialUser
      const pairing3 = await prisma.prayerPairing.create({
        data: {
          partner1Id: partner1.id,
          partner2Id: specialUser.id,
          themeId: randomTheme.id,
          startDate,
          endDate,
        },
      });
      pairings.push(pairing3);

      // 4. partner2 prays for specialUser
      const pairing4 = await prisma.prayerPairing.create({
        data: {
          partner1Id: partner2.id,
          partner2Id: specialUser.id,
          themeId: randomTheme.id,
          startDate,
          endDate,
        },
      });
      pairings.push(pairing4);

      // Send email notifications for the triangle pairing
      // specialUser gets notified about both partners
      const specialUserEmail = sendPrayerPartnerNotification(
        specialUser.email,
        `${specialUser.firstName} ${specialUser.lastName}`,
        `${partner1.firstName} ${partner1.lastName} and ${partner2.firstName} ${partner2.lastName}`,
        randomTheme.title,
        randomTheme.description,
        startDate,
        endDate,
        true // Indicate this is a special pairing
      );

      // Both partners get notified they're praying for the special user
      const partner1Email = sendPrayerPartnerNotification(
        partner1.email,
        `${partner1.firstName} ${partner1.lastName}`,
        `${specialUser.firstName} ${specialUser.lastName}`,
        randomTheme.title,
        randomTheme.description,
        startDate,
        endDate
      );

      const partner2Email = sendPrayerPartnerNotification(
        partner2.email,
        `${partner2.firstName} ${partner2.lastName}`,
        `${specialUser.firstName} ${specialUser.lastName}`,
        randomTheme.title,
        randomTheme.description,
        startDate,
        endDate
      );

      emailPromises.push(specialUserEmail, partner1Email, partner2Email);

      // Remove the first three users who are already paired
      shuffledUsers.splice(0, 3);
    }

    // Pair the remaining users normally (they should be even now)
    for (let i = 0; i < shuffledUsers.length; i += 2) {
      const partner1 = shuffledUsers[i];
      const partner2 = shuffledUsers[i + 1];

      // Create the pairing
      const pairing = await prisma.prayerPairing.create({
        data: {
          partner1Id: partner1.id,
          partner2Id: partner2.id,
          themeId: randomTheme.id,
          startDate,
          endDate,
        },
      });

      pairings.push(pairing);

      // Send email notifications to both partners
      const email1Promise = sendPrayerPartnerNotification(
        partner1.email,
        `${partner1.firstName} ${partner1.lastName}`,
        `${partner2.firstName} ${partner2.lastName}`,
        randomTheme.title,
        randomTheme.description,
        startDate,
        endDate
      );

      const email2Promise = sendPrayerPartnerNotification(
        partner2.email,
        `${partner2.firstName} ${partner2.lastName}`,
        `${partner1.firstName} ${partner1.lastName}`,
        randomTheme.title,
        randomTheme.description,
        startDate,
        endDate
      );

      emailPromises.push(email1Promise, email2Promise);
    }

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    console.log(`Successfully created ${pairings.length} prayer pairings`);
    return {
      success: true,
      count: pairings.length,
      message: `Successfully created ${pairings.length} prayer pairings`,
    };
  } catch (error) {
    console.error('Error generating weekly pairings:', error);
    return { success: false, error };
  }
};


