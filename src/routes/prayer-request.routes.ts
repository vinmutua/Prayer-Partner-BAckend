import express from 'express';
import * as PrayerRequestController from '../controllers/prayer-request.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';
import { prayerRequestValidation, validate } from '../middleware/validation.middleware';

const router = express.Router();

// Member routes
router.get('/my-requests', authenticateToken, PrayerRequestController.getUserPrayerRequests);
router.get('/current', authenticateToken, PrayerRequestController.getCurrentPrayerRequest);
router.post('/', authenticateToken, prayerRequestValidation, validate, PrayerRequestController.createPrayerRequest);
router.put('/:id', authenticateToken, prayerRequestValidation, validate, PrayerRequestController.updatePrayerRequest);
router.delete('/:id', authenticateToken, PrayerRequestController.deletePrayerRequest);

// Admin routes
router.get('/', authenticateToken, isAdmin, PrayerRequestController.getAllPrayerRequests);
router.get('/active', authenticateToken, isAdmin, PrayerRequestController.getActivePrayerRequests);
router.get('/user/:userId', authenticateToken, isAdmin, PrayerRequestController.getUserPrayerRequests);
router.get('/user/:userId/current', authenticateToken, isAdmin, PrayerRequestController.getCurrentPrayerRequest);

export default router;
