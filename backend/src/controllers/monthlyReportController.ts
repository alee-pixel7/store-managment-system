// Monthly Report Controller
// Handles HTTP requests for monthly report operations

import { Request, Response } from 'express';
import * as monthlyReportService from '../services/monthlyReportService';

// ============================================================
// GET /api/reports/monthly?year=2026&month=9
// ============================================================
export async function getMonthlyReport(req: Request, res: Response) {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month parameters are required' });
    }

    const yearNum = parseInt(year as string, 10);
    const monthNum = parseInt(month as string, 10);

    if (isNaN(yearNum) || isNaN(monthNum)) {
      return res.status(400).json({ error: 'Invalid year or month format' });
    }

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }

    if (yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: 'Year must be between 2000 and 2100' });
    }

    const report = await monthlyReportService.getMonthlyReport(yearNum, monthNum);
    res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate monthly report';
    console.error('❌ Monthly report generation failed:', message);
    res.status(500).json({ error: message });
  }
}
