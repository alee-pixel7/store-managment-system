// Report Routes
// Defines HTTP routes for report operations

import { Router } from 'express';
import * as reportController from '../controllers/reportController';
import * as monthlyReportController from '../controllers/monthlyReportController';

const router = Router();

// Daily report (authenticated users can view)
router.get('/daily', reportController.getDailyReport);

// Monthly report (authenticated users can view)
router.get('/monthly', monthlyReportController.getMonthlyReport);

export default router;
