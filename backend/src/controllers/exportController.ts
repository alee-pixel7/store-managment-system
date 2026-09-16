// Export Controller
// Handles HTTP requests for Excel and PDF exports

import { Request, Response } from 'express';
import * as reportService from '../services/reportService';
import * as monthlyReportService from '../services/monthlyReportService';
import * as itemService from '../services/itemService';
import * as excelExport from '../services/excelExportService';
import * as pdfExport from '../services/pdfExportService';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ============================================================
// GET /api/export/daily/:date?format=excel|pdf
// ============================================================
export async function exportDailyReport(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const format = (req.query.format as string) || 'excel';

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const safeDate = sanitizeFilename(date);
    const report = await reportService.getDailyReport(date);

    if (format === 'pdf') {
      const pdfBuffer = await pdfExport.exportDailyReportPDF(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="daily-report-${safeDate}.pdf"`);
      res.send(pdfBuffer);
    } else {
      const excelBuffer = await excelExport.exportDailyReportExcel(report);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="daily-report-${safeDate}.xlsx"`);
      res.send(excelBuffer);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    console.error('❌ Daily report export failed:', message);
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/export/monthly/:year/:month?format=excel|pdf
// ============================================================
export async function exportMonthlyReport(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const format = (req.query.format as string) || 'excel';

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum)) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const report = await monthlyReportService.getMonthlyReport(yearNum, monthNum);
    const monthName = sanitizeFilename(report.monthName.toLowerCase());

    if (format === 'pdf') {
      const pdfBuffer = await pdfExport.exportMonthlyReportPDF(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${monthName}-${sanitizeFilename(year)}.pdf"`);
      res.send(pdfBuffer);
    } else {
      const excelBuffer = await excelExport.exportMonthlyReportExcel(report);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${monthName}-${sanitizeFilename(year)}.xlsx"`);
      res.send(excelBuffer);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    console.error('❌ Monthly report export failed:', message);
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/export/items?format=excel|pdf
// ============================================================
export async function exportItemsList(req: Request, res: Response) {
  try {
    const format = (req.query.format as string) || 'excel';

    const result = await itemService.listItems({
      page: 1,
      limit: 10000,
      offset: 0,
      is_active: true,
    });

    if (format === 'pdf') {
      const pdfBuffer = await pdfExport.exportItemsListPDF(result.items);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="items-list.pdf"');
      res.send(pdfBuffer);
    } else {
      const excelBuffer = await excelExport.exportItemsListExcel(result.items);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="items-list.xlsx"');
      res.send(excelBuffer);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    console.error('❌ Items list export failed:', message);
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/export/ledger/:itemId?format=excel|pdf
// ============================================================
export async function exportItemLedger(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const format = (req.query.format as string) || 'excel';

    const id = parseInt(itemId, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const ledgerData = await itemService.getItemLedger(id, {});
    if (!ledgerData) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (format === 'pdf') {
      const pdfBuffer = await pdfExport.exportItemLedgerPDF(ledgerData.item, ledgerData.ledger);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ledger-${ledgerData.item.item_code}.pdf"`);
      res.send(pdfBuffer);
    } else {
      const excelBuffer = await excelExport.exportItemLedgerExcel(ledgerData.item, ledgerData.ledger);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="ledger-${ledgerData.item.item_code}.xlsx"`);
      res.send(excelBuffer);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    console.error('❌ Item ledger export failed:', message);
    res.status(500).json({ error: message });
  }
}
