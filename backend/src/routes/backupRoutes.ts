// Backup Routes
// Defines HTTP routes for backup operations

import { Router } from 'express';
import * as backupController from '../controllers/backupController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Manual backup trigger (ADMIN only)
router.post('/now', requireRole('ADMIN'), backupController.createBackup);

// List backups (ADMIN only)
router.get('/list', requireRole('ADMIN'), backupController.listBackups);

// Download backup (ADMIN only)
router.get('/download/:filename', requireRole('ADMIN'), backupController.downloadBackup);

// Restore from backup (ADMIN only)
router.post('/restore/:filename', requireRole('ADMIN'), backupController.restoreBackup);

export default router;
