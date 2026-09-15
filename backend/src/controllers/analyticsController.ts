// Analytics Controller
// Handles HTTP requests for analytics data

import { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService';

// ============================================================
// GET /api/analytics/consumption-trend?itemId=&months=
// ============================================================
export async function getConsumptionTrend(req: Request, res: Response) {
  try {
    const { itemId, months } = req.query;
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }
    const data = await analyticsService.getConsumptionTrend(
      parseInt(itemId as string),
      months ? parseInt(months as string) : 12
    );
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get consumption trend';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/analytics/machine-consumption?year=&month=
// ============================================================
export async function getMachineConsumption(req: Request, res: Response) {
  try {
    const now = new Date();
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const data = await analyticsService.getMachineConsumption(year, month);
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get machine consumption';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/analytics/unusual-consumption
// ============================================================
export async function getUnusualConsumption(req: Request, res: Response) {
  try {
    const data = await analyticsService.getUnusualConsumption();
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get unusual consumption';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/analytics/reorder-interval
// ============================================================
export async function getReorderInterval(req: Request, res: Response) {
  try {
    const data = await analyticsService.getReorderInterval();
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get reorder interval';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/analytics/dead-stock
// ============================================================
export async function getDeadStock(req: Request, res: Response) {
  try {
    const data = await analyticsService.getDeadStock();
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get dead stock';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/analytics/stock-value-trend
// ============================================================
export async function getStockValueTrend(req: Request, res: Response) {
  try {
    const data = await analyticsService.getStockValueTrend();
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stock value trend';
    res.status(500).json({ error: message });
  }
}
