import cron from 'node-cron';
import { generateWeeklyPairings } from './pairing.service';

// Schedule weekly pairing generation (Monday at 6:00 AM)
export const schedulePairingGeneration = () => {
  // '0 6 * * 1' = At 6:00 AM, only on Monday
  cron.schedule('0 6 * * 1', async () => {
    console.log('Running scheduled pairing generation...');
    await generateWeeklyPairings();
  });
  
  console.log('Weekly pairing generation scheduled for Mondays at 6:00 AM');
};
