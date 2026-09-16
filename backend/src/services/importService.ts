// Import Service Layer
// Handles Excel file parsing, validation, and import for items and stock

import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { generateTxnNo, recalculateStock } from '../utils/stock';

// ============================================================
// TYPES
// ============================================================
export interface ParsedExcelData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface MultiSheetData {
  sheets: Array<{
    name: string;
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
    detectedHeaderRow: number;
  }>;
  totalSheets: number;
}

export interface ColumnMapping {
  [excelColumn: string]: string; // excel column name -> database field
}

export interface ValidationError {
  row: number;
  column: string;
  value: any;
  message: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: ValidationError[];
  duplicates: string[];
}

// ============================================================
// EXCEL FIELD DEFINITIONS
// ============================================================
export const ITEM_FIELDS = {
  item_code: { label: 'Item Code', required: true, description: 'Unique identifier (e.g., BRG-6205)' },
  item_name: { label: 'Item Name', required: true, description: 'Descriptive name' },
  brand: { label: 'Brand', required: false, description: 'Manufacturer brand' },
  unit: { label: 'Unit', required: true, description: 'PCS, KG, MTR, LTR, SET' },
  min_stock: { label: 'Min Stock', required: false, description: 'Minimum stock level' },
  rack_location: { label: 'Rack Location', required: false, description: 'Storage location' },
  category: { label: 'Category', required: false, description: 'Item category name' },
  notes: { label: 'Notes', required: false, description: 'Additional notes' },
};

export const STOCK_FIELDS = {
  item_code: { label: 'Item Code', required: true, description: 'Must match existing item code' },
  quantity: { label: 'Quantity', required: true, description: 'Opening stock quantity' },
  rate: { label: 'Rate', required: false, description: 'Unit rate' },
  remarks: { label: 'Remarks', required: false, description: 'Additional notes' },
};

// ============================================================
// PARSE EXCEL FILE (single sheet - backward compatible)
// ============================================================
export function parseExcelFile(buffer: Buffer): ParsedExcelData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    throw new Error('Excel file contains no sheets');
  }

  const worksheet = workbook.Sheets[firstSheet];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  // First row is headers
  const headers = (jsonData[0] as any[]).map((h) => String(h || '').trim());

  // Rest are rows
  const rows: Record<string, any>[] = [];
  for (let i = 1; i < jsonData.length; i++) {
    const rowData = jsonData[i] as any[];
    // Skip completely empty rows
    if (rowData.every((cell) => cell === null || cell === undefined || cell === '')) {
      continue;
    }
    const row: Record<string, any> = {};
    headers.forEach((header, idx) => {
      row[header] = rowData[idx] ?? '';
    });
    rows.push(row);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

// ============================================================
// PARSE EXCEL FILE - MULTI-SHEET
// Returns all sheets with detected header rows
// ============================================================
export function parseExcelFileMultiSheet(buffer: Buffer): MultiSheetData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file contains no sheets');
  }

  const sheets: MultiSheetData['sheets'] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) continue;

    // Detect header row by searching first 10 rows for a row that looks like headers
    let headerRowIndex = 0;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(10, jsonData.length); r++) {
      const row = jsonData[r] as any[];
      if (!row || row.length < 2) continue;

      // A row is likely headers if it has at least 2 non-empty string cells
      const nonEmptyStrings = row.filter(
        (cell) => cell !== null && cell !== undefined && String(cell).trim().length > 0 && typeof cell === 'string'
      );

      if (nonEmptyStrings.length >= 2) {
        headerRowIndex = r;
        headers = row.map((h) => String(h || '').trim());
        break;
      }
    }

    // If no header detected, use first row
    if (headers.length === 0 && jsonData.length > 0) {
      headers = (jsonData[0] as any[]).map((h) => String(h || '').trim());
      headerRowIndex = 0;
    }

    // Parse data rows (skip header row and empty rows)
    const rows: Record<string, any>[] = [];
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const rowData = jsonData[i] as any[];
      if (!rowData || rowData.every((cell) => cell === null || cell === undefined || cell === '')) {
        continue;
      }
      const row: Record<string, any> = {};
      headers.forEach((header, idx) => {
        if (header) {
          row[header] = rowData[idx] ?? '';
        }
      });
      rows.push(row);
    }

    sheets.push({
      name: sheetName,
      headers: headers.filter((h) => h), // remove empty headers
      rows,
      totalRows: rows.length,
      detectedHeaderRow: headerRowIndex + 1, // 1-indexed for display
    });
  }

  return {
    sheets,
    totalSheets: sheets.length,
  };
}

// ============================================================
// VALIDATE ITEM ROW
// ============================================================
export function validateItemRow(
  row: Record<string, any>,
  mapping: ColumnMapping,
  existingCodes: Set<string>,
  rowNum: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required fields
  for (const [field, config] of Object.entries(ITEM_FIELDS)) {
    if (config.required) {
      const excelCol = Object.keys(mapping).find((k) => mapping[k] === field);
      if (excelCol) {
        const value = row[excelCol];
        if (value === '' || value === null || value === undefined) {
          errors.push({
            row: rowNum,
            column: field,
            value,
            message: `${config.label} is required`,
          });
        }
      }
    }
  }

  // Validate item_code uniqueness
  const codeCol = Object.keys(mapping).find((k) => mapping[k] === 'item_code');
  if (codeCol) {
    const code = String(row[codeCol] || '').trim().toUpperCase();
    if (code && existingCodes.has(code)) {
      errors.push({
        row: rowNum,
        column: 'item_code',
        value: code,
        message: `Item code "${code}" already exists`,
      });
    }
  }

  // Validate unit
  const unitCol = Object.keys(mapping).find((k) => mapping[k] === 'unit');
  if (unitCol) {
    const unit = String(row[unitCol] || '').trim().toUpperCase();
    const validUnits = ['PCS', 'KG', 'MTR', 'LTR', 'SET', 'NOS', 'BOX', 'PAIR'];
    if (unit && !validUnits.includes(unit)) {
      errors.push({
        row: rowNum,
        column: 'unit',
        value: unit,
        message: `Invalid unit "${unit}". Valid: ${validUnits.join(', ')}`,
      });
    }
  }

  // Validate min_stock is numeric
  const minStockCol = Object.keys(mapping).find((k) => mapping[k] === 'min_stock');
  if (minStockCol) {
    const val = row[minStockCol];
    if (val !== '' && val !== null && val !== undefined && isNaN(Number(val))) {
      errors.push({
        row: rowNum,
        column: 'min_stock',
        value: val,
        message: 'Min stock must be a number',
      });
    }
  }

  return errors;
}

// ============================================================
// VALIDATE STOCK ROW
// ============================================================
export function validateStockRow(
  row: Record<string, any>,
  mapping: ColumnMapping,
  existingCodes: Map<string, number>,
  rowNum: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check item_code exists
  const codeCol = Object.keys(mapping).find((k) => mapping[k] === 'item_code');
  if (codeCol) {
    const code = String(row[codeCol] || '').trim().toUpperCase();
    if (!code) {
      errors.push({
        row: rowNum,
        column: 'item_code',
        value: code,
        message: 'Item code is required',
      });
    } else if (!existingCodes.has(code)) {
      errors.push({
        row: rowNum,
        column: 'item_code',
        value: code,
        message: `Item code "${code}" not found in database`,
      });
    }
  }

  // Validate quantity
  const qtyCol = Object.keys(mapping).find((k) => mapping[k] === 'quantity');
  if (qtyCol) {
    const val = row[qtyCol];
    if (val === '' || val === null || val === undefined) {
      errors.push({
        row: rowNum,
        column: 'quantity',
        value: val,
        message: 'Quantity is required',
      });
    } else if (isNaN(Number(val)) || Number(val) <= 0) {
      errors.push({
        row: rowNum,
        column: 'quantity',
        value: val,
        message: 'Quantity must be a positive number',
      });
    }
  }

  // Validate rate is numeric
  const rateCol = Object.keys(mapping).find((k) => mapping[k] === 'rate');
  if (rateCol) {
    const val = row[rateCol];
    if (val !== '' && val !== null && val !== undefined && (isNaN(Number(val)) || Number(val) < 0)) {
      errors.push({
        row: rowNum,
        column: 'rate',
        value: val,
        message: 'Rate must be a non-negative number',
      });
    }
  }

  return errors;
}

// ============================================================
// IMPORT ITEMS
// ============================================================
export async function importItems(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  duplicateHandling: 'skip' | 'update'
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  const duplicates: string[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Get existing item codes
  const existingItems = await prisma.items.findMany({
    select: { item_code: true, id: true },
  });
  const existingCodes = new Set(existingItems.map((i) => i.item_code));
  const existingCodeMap = new Map(existingItems.map((i) => [i.item_code, i.id]));

  // Get or create categories
  const categoryMap = new Map<string, number>();

  for (const row of rows) {
    try {
      // Extract mapped values
      const itemCode = String(row[Object.keys(mapping).find((k) => mapping[k] === 'item_code') || ''] || '').trim().toUpperCase();
      const itemName = String(row[Object.keys(mapping).find((k) => mapping[k] === 'item_name') || ''] || '').trim();
      const brand = row[Object.keys(mapping).find((k) => mapping[k] === 'brand') || ''] || null;
      const unit = String(row[Object.keys(mapping).find((k) => mapping[k] === 'unit') || ''] || '').trim().toUpperCase();
      const minStock = Number(row[Object.keys(mapping).find((k) => mapping[k] === 'min_stock') || ''] || 0);
      const rackLocation = row[Object.keys(mapping).find((k) => mapping[k] === 'rack_location') || ''] || null;
      const categoryName = row[Object.keys(mapping).find((k) => mapping[k] === 'category') || ''] || null;
      const notes = row[Object.keys(mapping).find((k) => mapping[k] === 'notes') || ''] || null;

      // Validate required fields
      if (!itemCode || !itemName || !unit) {
        failed++;
        continue;
      }

      // Handle duplicates
      if (existingCodes.has(itemCode)) {
        if (duplicateHandling === 'skip') {
          skipped++;
          duplicates.push(itemCode);
          continue;
        }
        // Update existing
        const itemId = existingCodeMap.get(itemCode);
        if (itemId) {
          // Get or create category
          let categoryId = null;
          if (categoryName) {
            if (!categoryMap.has(categoryName)) {
              const cat = await prisma.categories.upsert({
                where: { name: categoryName },
                update: {},
                create: { name: categoryName },
              });
              categoryMap.set(categoryName, cat.id);
            }
            categoryId = categoryMap.get(categoryName)!;
          }

          await prisma.items.update({
            where: { id: itemId },
            data: {
              item_name: itemName,
              brand: brand || null,
              unit,
              min_stock: minStock || 0,
              rack_location: rackLocation || null,
              category_id: categoryId,
              notes: notes || null,
            },
          });
          imported++;
        }
      } else {
        // Create new item
        // Get or create category
        let categoryId = null;
        if (categoryName) {
          if (!categoryMap.has(categoryName)) {
            const cat = await prisma.categories.upsert({
              where: { name: categoryName },
              update: {},
              create: { name: categoryName },
            });
            categoryMap.set(categoryName, cat.id);
          }
          categoryId = categoryMap.get(categoryName)!;
        }

        await prisma.items.create({
          data: {
            item_code: itemCode,
            item_name: itemName,
            brand: brand || null,
            unit,
            min_stock: minStock || 0,
            rack_location: rackLocation || null,
            category_id: categoryId,
            notes: notes || null,
          },
        });
        existingCodes.add(itemCode);
        imported++;
      }
    } catch (error) {
      failed++;
      errors.push({
        row: 0,
        column: 'general',
        value: null,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { imported, skipped, failed, errors, duplicates };
}

// ============================================================
// IMPORT OPENING STOCK
// ============================================================
export async function importOpeningStock(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  userId: number
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  const duplicates: string[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Get existing items
  const existingItems = await prisma.items.findMany({
    select: { item_code: true, id: true, current_stock: true },
  });
  const existingCodeMap = new Map(existingItems.map((i) => [i.item_code, i.id]));
  const existingStockMap = new Map(existingItems.map((i) => [i.item_code, i.current_stock]));

  const year = new Date().getFullYear();
  let txnCounter = 0;

  for (const row of rows) {
    try {
      const itemCode = String(row[Object.keys(mapping).find((k) => mapping[k] === 'item_code') || ''] || '').trim().toUpperCase();
      const quantity = Number(row[Object.keys(mapping).find((k) => mapping[k] === 'quantity') || ''] || 0);
      const rate = row[Object.keys(mapping).find((k) => mapping[k] === 'rate') || ''] || null;
      const remarks = row[Object.keys(mapping).find((k) => mapping[k] === 'remarks') || ''] || null;

      // Validate
      if (!itemCode) {
        failed++;
        continue;
      }

      const itemId = existingCodeMap.get(itemCode);
      if (!itemId) {
        errors.push({
          row: 0,
          column: 'item_code',
          value: itemCode,
          message: `Item "${itemCode}" not found`,
        });
        failed++;
        continue;
      }

      if (quantity <= 0) {
        errors.push({
          row: 0,
          column: 'quantity',
          value: quantity,
          message: 'Quantity must be positive',
        });
        failed++;
        continue;
      }

      // Check if this item already has opening stock
      const currentStock = existingStockMap.get(itemCode) || 0;
      if (currentStock > 0) {
        // Skip items that already have stock
        skipped++;
        duplicates.push(itemCode);
        continue;
      }

      // Create ADJUST transaction for opening stock
      const txn_no = await generateTxnNo('ADJUST', year);

      await prisma.$transaction(async (tx) => {
        const transaction = await tx.transactions.create({
          data: {
            txn_no,
            txn_type: 'ADJUST',
            txn_date: new Date(),
            purpose: 'Opening stock import',
            remarks: remarks || `Imported from Excel`,
            created_by: userId,
          },
        });

        await tx.transaction_items.create({
          data: {
            transaction_id: transaction.id,
            item_id: itemId,
            quantity: quantity,
            rate: rate ? Number(rate) : null,
            line_remarks: 'Opening stock',
          },
        });

        // Recalculate stock
        const newStock = await recalculateStock(itemId, tx);
        await tx.items.update({
          where: { id: itemId },
          data: { current_stock: newStock },
        });
      });

      imported++;
    } catch (error) {
      failed++;
      errors.push({
        row: 0,
        column: 'general',
        value: null,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { imported, skipped, failed, errors, duplicates };
}

// ============================================================
// DAILY REPORT TRANSACTION IMPORT
// Imports OUT transactions from daily report Excel files
// Columns: SR NO, DATE, ITEM NAME, MACHINE NAME, BUYER NAME, REASON, TOTAL AMOUNT
// ============================================================

export const DAILY_REPORT_FIELDS = {
  sr_no: { label: 'SR NO', required: false, description: 'Serial number' },
  date: { label: 'DATE', required: true, description: 'Transaction date' },
  item_name: { label: 'ITEM NAME', required: true, description: 'Name of item issued' },
  machine_name: { label: 'MACHINE NAME', required: false, description: 'Machine the item went to' },
  buyer_name: { label: 'BUYER NAME', required: true, description: 'Person who received item' },
  reason: { label: 'REASON', required: false, description: 'Purpose/reason for issue' },
  total_amount: { label: 'TOTAL AMOUNT', required: true, description: 'Quantity + unit (e.g., "1 PCS")' },
};

// Parse "1 PCS", "5 PCS", "2PCS" into quantity and unit
function parseQuantityUnit(value: string): { quantity: number; unit: string } | null {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(PCS|KG|MTR|LTR|SET|NOS|BOX|PAIR)?$/i);
  if (match) {
    return {
      quantity: parseFloat(match[1]),
      unit: (match[2] || 'PCS').toUpperCase(),
    };
  }
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 0) {
    return { quantity: num, unit: 'PCS' };
  }
  return null;
}

// Parse dates: Excel serials, "6\5\2026", "6/5/2026", standard dates
function parseDailyReportDate(value: any): Date | null {
  if (!value) return null;

  // Excel serial number
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    const epoch = new Date(1900, 0, 1);
    const date = new Date(epoch.getTime() + (value - 2) * 86400000);
    if (!isNaN(date.getTime())) return date;
  }

  const str = String(value).trim();

  // Backslash format: 6\5\2026
  const bsMatch = str.match(/^(\d{1,2})\\(\d{1,2})\\(\d{2,4})$/);
  if (bsMatch) {
    const month = parseInt(bsMatch[1]);
    const day = parseInt(bsMatch[2]);
    let year = parseInt(bsMatch[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) return date;
  }

  // Slash format
  const slMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slMatch) {
    const month = parseInt(slMatch[1]);
    const day = parseInt(slMatch[2]);
    let year = parseInt(slMatch[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) return date;
  }

  // Standard date string
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;

  return null;
}

export interface DailyReportImportResult {
  imported: number;
  skipped: number;
  failed: number;
  unmatched: number;
  errors: ValidationError[];
  unmatchedItems: Array<{ row: number; item_name: string; buyer_name: string }>;
}

export async function importDailyReportTransactions(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  userId: number
): Promise<DailyReportImportResult> {
  const errors: ValidationError[] = [];
  const unmatchedItems: Array<{ row: number; item_name: string; buyer_name: string }> = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let unmatched = 0;

  const allItems = await prisma.items.findMany({
    where: { is_active: true },
    include: { item_aliases: { select: { alias_name: true } } },
  });

  const allPersons = await prisma.persons.findMany({ select: { id: true, name: true } });
  const allMachines = await prisma.machines.findMany({ select: { id: true, name: true } });

  const year = new Date().getFullYear();
  const rowsByDate = new Map<string, Record<string, any>[]>();

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 1;

    try {
      const itemNameRaw = String(row[Object.keys(mapping).find((k) => mapping[k] === 'item_name') || ''] || '').trim();
      const dateValue = row[Object.keys(mapping).find((k) => mapping[k] === 'date') || ''];
      const machineName = String(row[Object.keys(mapping).find((k) => mapping[k] === 'machine_name') || ''] || '').trim();
      const buyerName = String(row[Object.keys(mapping).find((k) => mapping[k] === 'buyer_name') || ''] || '').trim();
      const reason = String(row[Object.keys(mapping).find((k) => mapping[k] === 'reason') || ''] || '').trim();
      const totalAmount = String(row[Object.keys(mapping).find((k) => mapping[k] === 'total_amount') || ''] || '').trim();

      if (!itemNameRaw && !totalAmount) { skipped++; continue; }

      const txnDate = parseDailyReportDate(dateValue);
      if (!txnDate) {
        errors.push({ row: rowNum, column: 'date', value: dateValue, message: 'Could not parse date' });
        failed++;
        continue;
      }
      const dateKey = txnDate.toISOString().split('T')[0];

      const parsed = parseQuantityUnit(totalAmount);
      if (!parsed || parsed.quantity <= 0) {
        errors.push({ row: rowNum, column: 'total_amount', value: totalAmount, message: 'Could not parse quantity' });
        failed++;
        continue;
      }

      // Fuzzy item matching
      const normalizedSearch = itemNameRaw.toLowerCase().replace(/[\s\-_]/g, '');
      let matchedItem: typeof allItems[0] | null = null;

      for (const item of allItems) {
        if (item.item_name.toLowerCase() === itemNameRaw.toLowerCase()) { matchedItem = item; break; }
        const normalizedName = item.item_name.toLowerCase().replace(/[\s\-_]/g, '');
        if (normalizedName === normalizedSearch) { matchedItem = item; break; }
        for (const alias of item.item_aliases) {
          if (alias.alias_name.toLowerCase() === itemNameRaw.toLowerCase()) { matchedItem = item; break; }
          const normalizedAlias = alias.alias_name.toLowerCase().replace(/[\s\-_]/g, '');
          if (normalizedAlias === normalizedSearch) { matchedItem = item; break; }
        }
        if (matchedItem) break;
        if (item.item_name.toLowerCase().includes(itemNameRaw.toLowerCase()) ||
            itemNameRaw.toLowerCase().includes(item.item_name.toLowerCase())) {
          matchedItem = item;
        }
      }

      if (!matchedItem) {
        unmatched++;
        unmatchedItems.push({ row: rowNum, item_name: itemNameRaw, buyer_name: buyerName });
        continue;
      }

      let personId: number | null = null;
      if (buyerName) {
        const existingPerson = allPersons.find((p) => p.name.toLowerCase() === buyerName.toLowerCase());
        if (existingPerson) {
          personId = existingPerson.id;
        } else {
          const newPerson = await prisma.persons.create({ data: { name: buyerName } });
          allPersons.push(newPerson);
          personId = newPerson.id;
        }
      }

      let machineId: number | null = null;
      if (machineName) {
        const existingMachine = allMachines.find((m) => m.name.toLowerCase() === machineName.toLowerCase());
        if (existingMachine) machineId = existingMachine.id;
      }

      if (!rowsByDate.has(dateKey)) rowsByDate.set(dateKey, []);
      rowsByDate.get(dateKey)!.push({
        _rowNum: rowNum, _itemId: matchedItem.id, _itemCode: matchedItem.item_code,
        _quantity: parsed.quantity, _personId: personId, _machineId: machineId,
        _reason: reason, _dateValue: dateValue,
      });
    } catch (error) {
      failed++;
      errors.push({ row: rowNum, column: 'general', value: null, message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Create transactions grouped by date
  for (const [, items] of rowsByDate) {
    if (items.length === 0) continue;

    try {
      const groupedByPerson = new Map<string, Record<string, any>[]>();
      for (const item of items) {
        const key = `${item._personId || ''}-${item._machineId || ''}-${item._reason || ''}`;
        if (!groupedByPerson.has(key)) groupedByPerson.set(key, []);
        groupedByPerson.get(key)!.push(item);
      }

      for (const [, groupItems] of groupedByPerson) {
        const firstItem = groupItems[0];
        const txnDate = parseDailyReportDate(firstItem._dateValue) || new Date();

        await prisma.$transaction(async (tx) => {
          const txnNo = await generateTxnNo('OUT', year);

          const transaction = await tx.transactions.create({
            data: {
              txn_no: txnNo,
              txn_type: 'OUT',
              txn_date: txnDate,
              person_id: firstItem._personId,
              machine_id: firstItem._machineId,
              purpose: firstItem._reason || 'Daily report import',
              remarks: 'Imported from daily report Excel',
              created_by: userId,
            },
          });

          for (const item of groupItems) {
            await tx.transaction_items.create({
              data: {
                transaction_id: transaction.id,
                item_id: item._itemId,
                quantity: item._quantity,
                line_remarks: item._reason || null,
              },
            });
            const newStock = await recalculateStock(item._itemId, tx);
            await tx.items.update({ where: { id: item._itemId }, data: { current_stock: newStock } });
          }
        });
        imported++;
      }
    } catch (error) {
      failed++;
      errors.push({ row: 0, column: 'general', value: null, message: error instanceof Error ? error.message : 'Failed to create transaction' });
    }
  }

  return { imported, skipped, failed, unmatched, errors, unmatchedItems };
}
