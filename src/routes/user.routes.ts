import express from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Admin routes
router.get('/all', authenticateToken, isAdmin, UserController.getAllUsers);
router.put('/:id', authenticateToken, isAdmin, UserController.updateUser);
router.delete('/:id', authenticateToken, isAdmin, UserController.deleteUser);

export default router;
