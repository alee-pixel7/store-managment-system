// API Client for Import Operations

import { authFetch } from './fetch';

export interface ParsedFile {
  headers: string[];
  totalRows: number;
  preview: Record<string, any>[];
  rows: Record<string, any>[];
}

export interface SheetInfo {
  name: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  detectedHeaderRow: number;
}

export interface MultiSheetData {
  sheets: SheetInfo[];
  totalSheets: number;
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

export interface ValidationResponse {
  preview: Record<string, any>[];
  errors: ValidationError[];
  totalErrors: number;
  totalRows: number;
}

// ============================================================
// FIELD DEFINITIONS
// ============================================================
export const ITEM_FIELDS: Record<string, { label: string; required: boolean; description: string }> = {
  item_code: { label: 'Item Code', required: true, description: 'Unique identifier (e.g., BRG-6205)' },
  item_name: { label: 'Item Name', required: true, description: 'Descriptive name' },
  brand: { label: 'Brand', required: false, description: 'Manufacturer brand' },
  unit: { label: 'Unit', required: true, description: 'PCS, KG, MTR, LTR, SET' },
  min_stock: { label: 'Min Stock', required: false, description: 'Minimum stock level' },
  rack_location: { label: 'Rack Location', required: false, description: 'Storage location' },
  category: { label: 'Category', required: false, description: 'Item category name' },
  notes: { label: 'Notes', required: false, description: 'Additional notes' },
};

export const STOCK_FIELDS: Record<string, { label: string; required: boolean; description: string }> = {
  item_code: { label: 'Item Code', required: true, description: 'Must match existing item code' },
  quantity: { label: 'Quantity', required: true, description: 'Opening stock quantity' },
  rate: { label: 'Rate', required: false, description: 'Unit rate' },
  remarks: { label: 'Remarks', required: false, description: 'Additional notes' },
};

// ============================================================
// PARSE EXCEL FILE (returns all sheets)
// ============================================================
export async function parseExcelFile(file: File): Promise<MultiSheetData> {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('store_auth_token');
  const response = await fetch('/api/import/parse', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// VALIDATE ITEMS
// ============================================================
export async function validateItems(
  fileData: ParsedFile,
  mapping: Record<string, string>
): Promise<ValidationResponse> {
  return authFetch<ValidationResponse>('/import/validate-items', {
    method: 'POST',
    body: JSON.stringify({ fileData, mapping }),
  });
}

// ============================================================
// VALIDATE STOCK
// ============================================================
export async function validateStock(
  fileData: ParsedFile,
  mapping: Record<string, string>
): Promise<ValidationResponse> {
  return authFetch<ValidationResponse>('/import/validate-stock', {
    method: 'POST',
    body: JSON.stringify({ fileData, mapping }),
  });
}

// ============================================================
// IMPORT ITEMS
// ============================================================
export async function importItems(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  duplicateHandling: 'skip' | 'update'
): Promise<ImportResult> {
  return authFetch<ImportResult>('/import/items', {
    method: 'POST',
    body: JSON.stringify({ rows, mapping, duplicateHandling }),
  });
}

// ============================================================
// IMPORT OPENING STOCK
// ============================================================
export async function importOpeningStock(
  rows: Record<string, any>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  return authFetch<ImportResult>('/import/stock', {
    method: 'POST',
    body: JSON.stringify({ rows, mapping }),
  });
}

// ============================================================
// IMPORT DAILY REPORT TRANSACTIONS
// ============================================================
export interface DailyReportImportResult {
  imported: number;
  skipped: number;
  failed: number;
  unmatched: number;
  errors: ValidationError[];
  unmatchedItems: Array<{ row: number; item_name: string; buyer_name: string }>;
}

export async function importDailyReport(
  rows: Record<string, any>[],
  mapping: Record<string, string>
): Promise<DailyReportImportResult> {
  return authFetch<DailyReportImportResult>('/import/daily-report', {
    method: 'POST',
    body: JSON.stringify({ rows, mapping }),
  });
}

// ============================================================
// DOWNLOAD ERRORS
// ============================================================
export async function downloadErrors(errors: ValidationError[]): Promise<void> {
  const token = localStorage.getItem('store_auth_token');
  const response = await fetch('/api/import/errors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ errors }),
  });

  if (!response.ok) {
    throw new Error('Failed to download errors');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'import-errors.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
