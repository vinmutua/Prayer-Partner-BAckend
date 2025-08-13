import { prisma } from '../server';
import { sendPrayerPartnerNotification } from './email.service';

/**
 * Fisher-Yates shuffle algorithm for secure randomization
 * Provides cryptographically secure shuffling to prevent predictability
 */
const securelyShuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  const crypto = require('crypto');
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use crypto.randomInt for cryptographically secure random numbers
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

/**
 * Generates one-way prayer pairings where each participant knows who they're praying for
 * but doesn't know who's praying for them. Uses a circular arrangement to ensure
 * non-guessable assignments and prevent participants from deducing their prayer partner.
 * 
 * This function is designed to be called manually via API endpoint by administrators.
 */
export const generateMonthlyPairings = async () => {
  try {
    console.log('Starting one-way prayer pairing generation...');

    // Get all active users including admins
    const activeUsers = await prisma.user.findMany({
      where: {
        active: true
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });

    if (activeUsers.length < 3) {
      console.log('Need at least 3 active users for one-way pairings');
      return { success: false, message: 'Need at least 3 active users for one-way pairings' };
    }

    // Get a random active theme
    const activeThemes = await prisma.prayerTheme.findMany({
      where: { active: true },
    });

    if (activeThemes.length === 0) {
      console.log('No active themes found');
      return { success: false, message: 'No active themes found' };
    }

    // Select a random theme using crypto-secure randomization
    const crypto = require('crypto');
    const randomTheme = activeThemes[crypto.randomInt(0, activeThemes.length)];

    // Calculate start and end dates (start today, end in 30 days)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Create multiple rounds of shuffling to ensure non-predictability
    let shuffledUsers = securelyShuffleArray(activeUsers);
    
    // Additional shuffling rounds with different seeds to increase entropy
    for (let round = 0; round < 3; round++) {
      shuffledUsers = securelyShuffleArray(shuffledUsers);
    }

    // Create circular one-way pairing arrangement
    // Each user prays for the next user in the circle, with the last user praying for the first
    const pairings = [];
    const emailPromises = [];

    for (let i = 0; i < shuffledUsers.length; i++) {
      const prayerGiver = shuffledUsers[i];
      // Next person in circle (wraps around to first person for last user)
      const prayerReceiver = shuffledUsers[(i + 1) % shuffledUsers.length];

      // Create the one-way pairing (prayerGiver prays for prayerReceiver)
      const pairing = await prisma.prayerPairing.create({
        data: {
          partner1Id: prayerGiver.id,    // Person doing the praying
          partner2Id: prayerReceiver.id, // Person being prayed for
          themeId: randomTheme.id,
          startDate,
          endDate,
          isSpecialPairing: false, // All pairings are standard in one-way system
        },
      });

      pairings.push(pairing);

      // Send email notification only to the prayer giver
      // They learn who they're praying for, but don't know who's praying for them
      const emailPromise = sendPrayerPartnerNotification(
        prayerGiver.email,
        `${prayerGiver.firstName} ${prayerGiver.lastName}`,
        `${prayerReceiver.firstName} ${prayerReceiver.lastName}`,
        randomTheme.title,
        randomTheme.description,
        startDate,
        endDate,
        false, // Not a special pairing
        'This is a one-way prayer assignment - you know who to pray for, but your prayer partner remains anonymous to you. This pairing will last for one month.'
      );

      emailPromises.push(emailPromise);
    }

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    console.log(`Successfully created ${pairings.length} one-way prayer pairings in circular arrangement`);
    console.log('One-way pairing ensures participants know who they pray for but not who prays for them');
    
    return {
      success: true,
      count: pairings.length,
      message: `Successfully created ${pairings.length} one-way prayer pairings`,
      pairingType: 'one-way-circular',
    };
  } catch (error) {
    console.error('Error generating one-way prayer pairings:', error);
    return { success: false, error };
  }
};


