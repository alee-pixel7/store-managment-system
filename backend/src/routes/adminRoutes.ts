// Admin Routes
// Dangerous administrative operations — ADMIN only

import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Factory reset (wipes everything — ADMIN only + typed confirmation)
router.post('/factory-reset', requireRole('ADMIN'), adminController.factoryReset);

export default router;
