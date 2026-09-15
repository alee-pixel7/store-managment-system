// Dashboard Controller
// Handles HTTP requests for dashboard data

import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService';

// ============================================================
// GET /api/dashboard/summary - Get dashboard summary
// ============================================================
export async function getSummary(req: Request, res: Response) {
  try {
    const summary = await dashboardService.getDashboardSummary();
    res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    res.status(500).json({ error: message });
  }
}
