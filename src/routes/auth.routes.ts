import express from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { registerValidation, loginValidation, validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/async-handler.util';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validate, asyncHandler(AuthController.register));
router.post('/login', loginValidation, validate, asyncHandler(AuthController.login));
router.post('/refresh-token', asyncHandler(AuthController.refreshToken));

// Protected routes
router.get('/me', authenticateToken, asyncHandler(AuthController.getCurrentUser));

export default router;
