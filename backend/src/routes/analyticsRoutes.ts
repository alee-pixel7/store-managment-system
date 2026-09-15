// Analytics Routes
// Defines HTTP routes for analytics endpoints

import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';

const router = Router();

router.get('/consumption-trend', analyticsController.getConsumptionTrend);
router.get('/machine-consumption', analyticsController.getMachineConsumption);
router.get('/unusual-consumption', analyticsController.getUnusualConsumption);
router.get('/reorder-interval', analyticsController.getReorderInterval);
router.get('/dead-stock', analyticsController.getDeadStock);
router.get('/stock-value-trend', analyticsController.getStockValueTrend);

export default router;
