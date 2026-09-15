// Audit Routes
// Defines HTTP routes for stock audit operations

import { Router } from 'express';
import * as auditController from '../controllers/auditController';
import { requireRole } from '../middleware/auth';

const router = Router();

// List all audits
router.get('/', auditController.listAudits);

// Start new audit (STORE_INCHARGE or higher)
router.post('/', requireRole('STORE_INCHARGE'), auditController.startAudit);

// Get audit detail
router.get('/:id', auditController.getAudit);

// Count an item (ASSISTANT or higher)
router.post('/:id/count', requireRole('ASSISTANT'), auditController.countItem);

// Search items in audit
router.get('/:id/search', auditController.searchItems);

// Get variance report
router.get('/:id/variance', auditController.getVarianceReport);

// Finalise audit (ADMIN only)
router.post('/:id/finalise', requireRole('ADMIN'), auditController.finaliseAudit);

export default router;
