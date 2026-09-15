// Export Routes
// Defines HTTP routes for export operations

import { Router } from 'express';
import * as exportController from '../controllers/exportController';

const router = Router();

// Daily report export
router.get('/daily/:date', exportController.exportDailyReport);

// Monthly report export
router.get('/monthly/:year/:month', exportController.exportMonthlyReport);

// Items list export
router.get('/items', exportController.exportItemsList);

// Item ledger export
router.get('/ledger/:itemId', exportController.exportItemLedger);

export default router;
