// Excel Export Service
// Premium "Noir + Amethyst" workbooks using ExcelJS — matches the app identity

import ExcelJS from 'exceljs';
import { formatDate } from '../utils/dates';
import type { DailyReport } from './reportService';
import type { MonthlyReport } from './monthlyReportService';

const STORE_NAME = 'Store Management System';

// Noir + Amethyst palette (ARGB)
const BRAND = {
  accent: 'FF8B5CF6',
  accentDark: 'FF6D28D9',
  noir: 'FF141026',
  light: 'FFF5F3FF',
  tint: 'FFFAF7FF',
  border: 'FFE9E5F5',
  text: 'FF111827',
  white: 'FFFFFFFF',
};

function solid(argb: string): ExcelJS.FillPattern {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function cellBorder(): Partial<ExcelJS.Borders> {
  const t = { style: 'thin' as const, color: { argb: BRAND.border } };
  return { top: t, bottom: t, left: t, right: t };
}

// TITLE BANNER — Noir row + lavender subtitle (merged)
function addTitleBanner(sheet: ExcelJS.Worksheet, title: string, subtitle: string, colCount: number) {
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title.toUpperCase();
  titleCell.font = { bold: true, size: 15, color: { argb: BRAND.white } };
  titleCell.fill = solid(BRAND.noir);
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, colCount);
  const subCell = sheet.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = { bold: true, size: 10, color: { argb: BRAND.accentDark } };
  subCell.fill = solid(BRAND.light);
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 20;

  sheet.getRow(3).height = 6;
}

// STYLE TABLE — banner + purple header + zebra + borders + freeze + filter
interface TableOptions {
  currencyCols?: number[];
  intCols?: number[];
}

function styleTable(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  title: string,
  subtitle: string,
  opts: TableOptions = {}
) {
  const colCount = headers.length;
  addTitleBanner(sheet, title, subtitle, colCount);

  // Header row (row 4)
  const headerRow = sheet.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: BRAND.white } };
    cell.fill = solid(BRAND.accent);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = cellBorder();
  });
  headerRow.height = 22;

  // Data rows (row 5+) with zebra + borders
  rows.forEach((rowData, r) => {
    const row = sheet.getRow(5 + r);
    rowData.forEach((value, c) => {
      const cell = row.getCell(c + 1);
      cell.value = value as ExcelJS.CellValue;
      cell.font = { size: 10, color: { argb: BRAND.text } };
      cell.alignment = { vertical: 'middle' };
      cell.border = cellBorder();
      if (r % 2 === 0) cell.fill = solid(BRAND.tint);

      if (opts.currencyCols?.includes(c)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (opts.intCols?.includes(c)) {
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
  });

  // Column widths (header + data, capped)
  headers.forEach((h, i) => {
    let maxLength = h.length + 4;
    for (const rowData of rows) {
      const len = rowData[i] != null ? String(rowData[i]).length : 0;
      if (len > maxLength) maxLength = len;
    }
    sheet.getColumn(i + 1).width = Math.min(maxLength + 2, 38);
  });

  // Frozen panes + filter + purple tab
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: colCount } };
  sheet.properties.tabColor = { argb: BRAND.accent };
}

// STYLED SUMMARY SHEET — chip heading + label/value metrics
function addSummarySection(sheet: ExcelJS.Worksheet, heading: string, metrics: [string, string | number][]) {
  addTitleBanner(sheet, STORE_NAME, heading, 2);

  sheet.mergeCells(4, 1, 4, 2);
  const chip = sheet.getCell(4, 1);
  chip.value = heading.toUpperCase();
  chip.font = { bold: true, size: 10, color: { argb: BRAND.white } };
  chip.fill = solid(BRAND.accent);
  chip.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(4).height = 22;

  metrics.forEach(([label, value], i) => {
    const row = sheet.getRow(5 + i);
    const labelCell = row.getCell(1);
    const valueCell = row.getCell(2);

    labelCell.value = label;
    labelCell.font = { bold: true, size: 10, color: { argb: BRAND.text } };
    labelCell.alignment = { vertical: 'middle' };
    labelCell.border = cellBorder();

    valueCell.value = value;
    valueCell.font = { size: 10, color: { argb: BRAND.accentDark } };
    valueCell.alignment = { vertical: 'middle', horizontal: 'right' };
    valueCell.border = cellBorder();
    if (typeof value === 'number') {
      valueCell.numFmt = value % 1 === 0 ? '#,##0' : '#,##0.00';
    }

    if (i % 2 === 0) {
      labelCell.fill = solid(BRAND.tint);
      valueCell.fill = solid(BRAND.tint);
    }
  });

  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 24;
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.properties.tabColor = { argb: BRAND.accent };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value);
}

// DAILY REPORT EXPORT
export async function exportDailyReportExcel(report: DailyReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STORE_NAME;
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  addSummarySection(summarySheet, `Daily Report — ${formatDate(report.date)}`, [
    ['Total Receipts', report.summary.totalReceipts],
    ['Total Issues', report.summary.totalIssues],
    ['Total Returns', report.summary.totalReturns],
    ['Total Transactions', report.summary.totalTransactions],
    ['Receipt Qty', report.summary.totalReceiptQty],
    ['Issue Qty', report.summary.totalIssueQty],
    ['Return Qty', report.summary.totalReturnQty],
  ]);

  if (report.receipts.length > 0) {
    const receiptsSheet = workbook.addWorksheet('Receipts');
    styleTable(
      receiptsSheet,
      ['Item Code', 'Item Name', 'Brand', 'Qty', 'Rate', 'Total', 'Supplier', 'Invoice No', 'Txn No'],
      report.receipts.map((r) => [r.itemCode, r.itemName, r.brand || '', r.qty, r.rate, r.total, r.supplier, r.invoiceNo, r.txnNo]),
      'Receipts (Stock IN)',
      `Daily Report — ${formatDate(report.date)}`,
      { currencyCols: [4, 5], intCols: [3] }
    );
  }

  if (report.issues.length > 0) {
    const issuesSheet = workbook.addWorksheet('Issues');
    styleTable(
      issuesSheet,
      ['Item Code', 'Item Name', 'Brand', 'Qty', 'Issued To', 'Department', 'Machine', 'Purpose', 'Txn No'],
      report.issues.map((i) => [i.itemCode, i.itemName, i.brand || '', i.qty, i.issuedTo, i.department || '', i.machine || '', i.purpose, i.txnNo]),
      'Issues (Stock OUT)',
      `Daily Report — ${formatDate(report.date)}`,
      { intCols: [3] }
    );
  }

  if (report.itemsBelowMinimum.length > 0) {
    const belowMinSheet = workbook.addWorksheet('Below Minimum');
    styleTable(
      belowMinSheet,
      ['Item Code', 'Item Name', 'Brand', 'Current Stock', 'Min Stock', 'Unit'],
      report.itemsBelowMinimum.map((item) => [item.itemCode, item.itemName, item.brand || '', item.currentStock, item.minStock, item.unit]),
      'Items Below Minimum Stock',
      `Daily Report — ${formatDate(report.date)}`,
      { intCols: [3, 4] }
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// MONTHLY REPORT EXPORT
export async function exportMonthlyReportExcel(report: MonthlyReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STORE_NAME;
  workbook.created = new Date();

  const period = `${report.monthName} ${report.year}`;

  const summarySheet = workbook.addWorksheet('Summary');
  addSummarySection(summarySheet, `Monthly Report — ${period}`, [
    ['Total Received', report.summary.totalReceived],
    ['Total Issued', report.summary.totalIssued],
    ['Total Returned', report.summary.totalReturned],
    ['Total Transactions', report.summary.totalTransactions],
    ['Received Value', report.summary.totalReceivedValue],
    ['Issued Value', report.summary.totalIssuedValue],
    ['Returned Value', report.summary.totalReturnedValue],
    ['Opening Stock Value', report.stockValue.opening],
    ['Closing Stock Value', report.stockValue.closing],
  ]);

  if (report.departmentConsumption.length > 0) {
    const deptSheet = workbook.addWorksheet('Department Consumption');
    styleTable(
      deptSheet,
      ['Department', 'Quantity', 'Value', 'Items'],
      report.departmentConsumption.map((d) => [d.department, d.totalQty, d.totalValue, d.items]),
      'Department-wise Consumption',
      `Monthly Report — ${period}`,
      { currencyCols: [2], intCols: [1, 3] }
    );
  }

  if (report.machineConsumption.length > 0) {
    const machSheet = workbook.addWorksheet('Machine Consumption');
    styleTable(
      machSheet,
      ['Machine', 'Department', 'Quantity', 'Value', 'Items'],
      report.machineConsumption.map((m) => [m.machine, m.department || '', m.totalQty, m.totalValue, m.items]),
      'Machine-wise Consumption',
      `Monthly Report — ${period}`,
      { currencyCols: [3], intCols: [2, 4] }
    );
  }

  if (report.topConsumedItems.length > 0) {
    const topSheet = workbook.addWorksheet('Top Consumed Items');
    styleTable(
      topSheet,
      ['#', 'Item Code', 'Item Name', 'Brand', 'Unit', 'Received', 'Issued', 'Net', 'Value'],
      report.topConsumedItems.map((item, index) => [index + 1, item.itemCode, item.itemName, item.brand || '', item.unit, item.totalReceived, item.totalIssued, item.netConsumption, item.estimatedValue]),
      'Top Consumed Items',
      `Monthly Report — ${period}`,
      { currencyCols: [8], intCols: [0, 5, 6, 7] }
    );
  }

  if (report.outOfStockItems.length > 0) {
    const oosSheet = workbook.addWorksheet('Out of Stock');
    styleTable(
      oosSheet,
      ['Item Code', 'Item Name', 'Brand', 'Unit', 'Min Stock', 'Days Out of Stock'],
      report.outOfStockItems.map((item) => [item.itemCode, item.itemName, item.brand || '', item.unit, item.minStock, item.daysOutOfStock]),
      'Items Out of Stock',
      `Monthly Report — ${period}`,
      { intCols: [4, 5] }
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ITEMS LIST EXPORT
export async function exportItemsListExcel(items: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STORE_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Items');
  styleTable(
    sheet,
    ['Item Code', 'Item Name', 'Category', 'Brand', 'Spec / Unit', 'Unit', 'Min Stock', 'Current Stock', 'Last Rate', 'Rack Location', 'Status'],
    items.map((item) => [
      item.item_code,
      item.item_name,
      item.category?.name || '',
      item.brand || '',
      item.spec || '',
      item.unit,
      item.min_stock,
      item.current_stock,
      item.last_rate || 0,
      item.rack_location || '',
      item.is_active ? 'Active' : 'Inactive',
    ]),
    'Items List',
    `${items.length} items in inventory`,
    { currencyCols: [8], intCols: [6, 7] }
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ITEM LEDGER EXPORT
export async function exportItemLedgerExcel(itemData: any, ledger: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STORE_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Ledger');
  styleTable(
    sheet,
    ['Date', 'Txn No', 'Type', 'In Qty', 'Out Qty', 'Balance', 'Rate', 'Party', 'Purpose', 'Remarks'],
    ledger.map((entry) => [
      formatDate(entry.date),
      entry.txn_no,
      entry.txn_type,
      entry.in_qty || '',
      entry.out_qty || '',
      entry.running_balance,
      entry.rate || '',
      entry.party || '',
      entry.purpose || '',
      entry.remarks || '',
    ]),
    'Item Ledger',
    `${itemData.item_code} — ${itemData.item_name}`,
    { currencyCols: [6], intCols: [3, 4, 5] }
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
