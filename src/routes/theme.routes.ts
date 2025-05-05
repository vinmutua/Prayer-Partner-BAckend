import express from 'express';
import * as ThemeController from '../controllers/theme.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes (still requires authentication)
router.get('/active', authenticateToken, ThemeController.getActiveThemes);
router.get('/:id', authenticateToken, ThemeController.getThemeById);

// Admin routes
router.get('/', authenticateToken, isAdmin, ThemeController.getAllThemes);
router.post('/', authenticateToken, isAdmin, ThemeController.createTheme);
router.put('/:id', authenticateToken, isAdmin, ThemeController.updateTheme);
router.delete('/:id', authenticateToken, isAdmin, ThemeController.deleteTheme);

export default router;
