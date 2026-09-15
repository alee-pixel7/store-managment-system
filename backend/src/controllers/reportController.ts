// Daily Report Controller
// Handles HTTP requests for daily report operations

import { Request, Response } from 'express';
import * as reportService from '../services/reportService';

// ============================================================
// GET /api/reports/daily?date=YYYY-MM-DD
// ============================================================
export async function getDailyReport(req: Request, res: Response) {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate date is valid
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const report = await reportService.getDailyReport(date);
    res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    console.error('❌ Report generation failed:', message);
    res.status(500).json({ error: message });
  }
}
