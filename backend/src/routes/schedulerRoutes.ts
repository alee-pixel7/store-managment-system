// Scheduler Routes
// Defines HTTP routes for report scheduler configuration and operations

import { Router } from 'express';
import * as schedulerController from '../controllers/schedulerController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Get scheduler status
router.get('/status', schedulerController.getStatus);

// Update scheduler settings (ADMIN only)
router.put('/settings', requireRole('ADMIN'), schedulerController.updateSettings);

// Generate report immediately
router.post('/run-now', requireRole('ADMIN'), schedulerController.runNow);

// Email queue operations
router.get('/queue', schedulerController.getQueue);
router.post('/queue/retry', requireRole('ADMIN'), schedulerController.retryQueue);
router.delete('/queue', requireRole('ADMIN'), schedulerController.clearQueue);

// List generated reports
router.get('/reports', schedulerController.listReports);

export default router;
