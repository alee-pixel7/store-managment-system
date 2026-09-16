// Import Controller
// Handles HTTP requests for Excel import operations

import { Request, Response } from 'express';
import * as importService from '../services/importService';
import prisma from '../lib/prisma';

// ============================================================
// POST /api/import/parse - Parse Excel file and return all sheets
// ============================================================
export async function parseFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const multiSheet = importService.parseExcelFileMultiSheet(req.file.buffer);

    res.json({
      sheets: multiSheet.sheets,
      totalSheets: multiSheet.totalSheets,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse file';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// POST /api/import/validate-items - Validate item data with mapping
// ============================================================
export async function validateItems(req: Request, res: Response) {
  try {
    const { fileData, mapping } = req.body;

    if (!fileData || !mapping) {
      return res.status(400).json({ error: 'File data and mapping are required' });
    }

    // Get existing item codes
    const existingItems = await prisma.items.findMany({
      select: { item_code: true },
    });
    const existingCodes = new Set(existingItems.map((i) => i.item_code));

    // Validate first 20 rows
    const previewRows = fileData.rows.slice(0, 20);
    const allErrors: importService.ValidationError[] = [];

    previewRows.forEach((row: Record<string, any>, idx: number) => {
      const errors = importService.validateItemRow(row, mapping, existingCodes, idx + 1);
      allErrors.push(...errors);
    });

    // Also validate all rows for summary
    const fullErrors: importService.ValidationError[] = [];
    fileData.rows.forEach((row: Record<string, any>, idx: number) => {
      const errors = importService.validateItemRow(row, mapping, existingCodes, idx + 1);
      fullErrors.push(...errors);
    });

    res.json({
      preview: previewRows,
      errors: allErrors,
      totalErrors: fullErrors.length,
      totalRows: fileData.rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation failed';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/import/validate-stock - Validate stock data with mapping
// ============================================================
export async function validateStock(req: Request, res: Response) {
  try {
    const { fileData, mapping } = req.body;

    if (!fileData || !mapping) {
      return res.status(400).json({ error: 'File data and mapping are required' });
    }

    // Get existing items
    const existingItems = await prisma.items.findMany({
      select: { item_code: true, id: true },
    });
    const existingCodeMap = new Map(existingItems.map((i) => [i.item_code, i.id]));

    // Validate first 20 rows
    const previewRows = fileData.rows.slice(0, 20);
    const allErrors: importService.ValidationError[] = [];

    previewRows.forEach((row: Record<string, any>, idx: number) => {
      const errors = importService.validateStockRow(row, mapping, existingCodeMap, idx + 1);
      allErrors.push(...errors);
    });

    // Also validate all rows for summary
    const fullErrors: importService.ValidationError[] = [];
    fileData.rows.forEach((row: Record<string, any>, idx: number) => {
      const errors = importService.validateStockRow(row, mapping, existingCodeMap, idx + 1);
      fullErrors.push(...errors);
    });

    res.json({
      preview: previewRows,
      errors: allErrors,
      totalErrors: fullErrors.length,
      totalRows: fileData.rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation failed';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/import/items - Import items
// ============================================================
export async function importItems(req: Request, res: Response) {
  try {
    const { rows, mapping, duplicateHandling } = req.body;

    if (!rows || !mapping) {
      return res.status(400).json({ error: 'Rows and mapping are required' });
    }

    const result = await importService.importItems(
      rows,
      mapping,
      duplicateHandling || 'skip'
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/import/stock - Import opening stock
// ============================================================
export async function importStock(req: Request, res: Response) {
  try {
    const { rows, mapping } = req.body;

    if (!rows || !mapping) {
      return res.status(400).json({ error: 'Rows and mapping are required' });
    }

    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await importService.importOpeningStock(rows, mapping, userId);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/import/daily-report - Import daily report transactions
// ============================================================
export async function importDailyReport(req: Request, res: Response) {
  try {
    const { rows, mapping } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows is required and must be a non-empty array' });
    }

    if (!mapping || typeof mapping !== 'object') {
      return res.status(400).json({ error: 'mapping is required' });
    }

    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await importService.importDailyReportTransactions(rows, mapping, userId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/import/errors - Download errors as CSV
// ============================================================
export async function downloadErrors(req: Request, res: Response) {
  try {
    const { errors } = req.body;

    if (!errors || !Array.isArray(errors)) {
      return res.status(400).json({ error: 'Errors array is required' });
    }

    // Create CSV content — sanitize cells to prevent CSV injection
    const sanitize = (val: string) => {
      const safe = String(val).replace(/"/g, '""');
      return /^[=+\-@\t\r]/.test(safe) ? `'${safe}` : safe;
    };
    const headers = 'Row,Column,Value,Message\n';
    const rows = errors
      .map((e: importService.ValidationError) => {
        return `${e.row},"${sanitize(e.column)}","${sanitize(String(e.value))}","${sanitize(e.message)}"`;
      })
      .join('\n');

    const csv = headers + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=import-errors.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate error file' });
  }
}
