import express from 'express';
import * as PairingController from '../controllers/pairing.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';
import { validatePairingRequest } from '../middleware/validation.middleware';

const router = express.Router();

// Member routes
router.get('/current-partner', authenticateToken, PairingController.getCurrentPartner);
router.get('/history', authenticateToken, PairingController.getUserPairingHistory);

// Admin routes
router.get('/', authenticateToken, isAdmin, PairingController.getCurrentPairings);
router.post('/', authenticateToken, isAdmin, validatePairingRequest, PairingController.createPairing);
router.post('/generate', authenticateToken, isAdmin, validatePairingRequest, PairingController.generatePairings);
router.get('/export-csv', authenticateToken, isAdmin, PairingController.exportPairingsToCSV);
router.delete('/clear-all', authenticateToken, isAdmin, PairingController.clearAllPairings);
router.delete('/:id', authenticateToken, isAdmin, PairingController.deletePairing);
router.post('/send-partner-emails', authenticateToken, isAdmin, PairingController.sendPartnerEmails);
router.post('/send-reminder-emails', authenticateToken, isAdmin, PairingController.sendReminderEmails);
router.post('/:id/send-email', authenticateToken, isAdmin, PairingController.sendEmailToPairing);

// Admin can view any user's current partner and history
router.get('/user/:userId/current-partner', authenticateToken, isAdmin, PairingController.getCurrentPartner);
router.get('/user/:userId/history', authenticateToken, isAdmin, PairingController.getUserPairingHistory);

export default router;
