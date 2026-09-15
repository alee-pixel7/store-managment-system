// Auth Routes
// Defines all HTTP routes for authentication

import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);

export default router;
