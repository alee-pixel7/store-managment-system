// Excel Export Service
// Generates Excel files with proper formatting using ExcelJS

import ExcelJS from 'exceljs';
import { formatDate } from '../utils/dates';
import type { DailyReport } from './reportService';
import type { MonthlyReport } from './monthlyReportService';

const STORE_NAME = 'Store Management System';

// ============================================================
// STYLE HELPERS
// ============================================================
function addHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]) {
  const row = sheet.addRow(headers);
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  return row;
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 10;
    if (column.eachCell) {
      column.eachCell({ includeEmpty: false }, (cell) => {
        const length = cell.value ? cell.value.toString().length : 0;
        if (length > maxLength) maxLength = length;
      });
    }
    column.width = Math.min(maxLength + 2, 40);
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value);
}

// ============================================================
// DAILY REPORT EXPORT
// ============================================================
export async function exportDailyReportExcel(report: DailyReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STORE_NAME;
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow([STORE_NAME]);
  summarySheet.getRow(1).font = { bold: true, size: 14 };
  summarySheet.addRow([`Daily Report - ${formatDate(report.date)}`]);
  summarySheet.getRow(2).font = { size: 12 };
  summarySheet.addRow([]);

  summarySheet.addRow(['Summary']);
  summarySheet.getRow(4).font = { bold: true, size: 12 };
  summarySheet.addRow(['Total Receipts', report.summary.totalReceipts]);
  summarySheet.addRow(['Total Issues', report.summary.totalIssues]);
  summarySheet.addRow(['Total Returns', report.summary.totalReturns]);
  summarySheet.addRow(['Total Transactions', report.summary.totalTransactions]);
  summarySheet.addRow(['Receipt Qty', report.summary.totalReceiptQty]);
  summarySheet.addRow(['Issue Qty', report.summary.totalIssueQty]);
  summarySheet.addRow(['Return Qty', report.summary.totalReturnQty]);
  summarySheet.addRow([]);

  // Receipts Sheet
  if (report.receipts.length > 0) {
    const receiptsSheet = workbook.addWorksheet('Receipts');
    addHeaderRow(receiptsSheet, ['Item Code', 'Item Name', 'Brand', 'Qty', 'Rate', 'Total', 'Supplier', 'Invoice No', 'Txn No']);
    
    for (const r of report.receipts) {
      receiptsSheet.addRow([r.itemCode, r.itemName, r.brand || '', r.qty, r.rate, r.total, r.supplier, r.invoiceNo, r.txnNo]);
    }
    autoFitColumns(receiptsSheet);
  }

  // Issues Sheet
  if (report.issues.length > 0) {
    const issuesSheet = workbook.addWorksheet('Issues');
    addHeaderRow(issuesSheet, ['Item Code', 'Item Name', 'Brand', 'Qty', 'Issued To', 'Department', 'Machine', 'Purpose', 'Txn No']);
    
    for (const i of report.issues) {
      issuesSheet.addRow([i.itemCode, i.itemName, i.brand || '', i.qty, i.issuedTo, i.department || '', i.machine || '', i.purpose, i.txnNo]);
    }
    autoFitColumns(issuesSheet);
  }

  // Items Below Minimum Sheet
  if (report.itemsBelowMinimum.length > 0) {
    const belowMinSheet = workbook.addWorksheet('Below Minimum');
    addHeaderRow(belowMinSheet, ['Item Code', 'Item Name', 'Brand', 'Current Stock', 'Min Stock', 'Unit']);
    
    for (const item of report.itemsBelowMinimum) {
      belowMinSheet.addRow([item.itemCode, item.itemName, item.brand || '', item.currentStock, item.minStock, item.unit]);
    }
    autoFitColumns(belowMinSheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================
// MONTHLY REPORT EXPORT
// ============================================================
export async function exportMonthlyReportExcel(report: MonthlyReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STORE_NAME;
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow([STORE_NAME]);
  summarySheet.getRow(1).font = { bold: true, size: 14 };
  summarySheet.addRow([`Monthly Report - ${report.monthName} ${report.year}`]);
  summarySheet.getRow(2).font = { size: 12 };
  summarySheet.addRow([]);

  summarySheet.addRow(['Summary']);
  summarySheet.getRow(4).font = { bold: true, size: 12 };
  summarySheet.addRow(['Total Received', report.summary.totalReceived]);
  summarySheet.addRow(['Total Issued', report.summary.totalIssued]);
  summarySheet.addRow(['Total Returned', report.summary.totalReturned]);
  summarySheet.addRow(['Total Transactions', report.summary.totalTransactions]);
  summarySheet.addRow(['Received Value', report.summary.totalReceivedValue]);
  summarySheet.addRow(['Issued Value', report.summary.totalIssuedValue]);
  summarySheet.addRow(['Returned Value', report.summary.totalReturnedValue]);
  summarySheet.addRow(['Opening Stock Value', report.stockValue.opening]);
  summarySheet.addRow(['Closing Stock Value', report.stockValue.closing]);
  summarySheet.addRow([]);

  // Department Consumption Sheet
  if (report.departmentConsumption.length > 0) {
    const deptSheet = workbook.addWorksheet('Department Consumption');
    addHeaderRow(deptSheet, ['Department', 'Quantity', 'Value', 'Items']);
    
    for (const d of report.departmentConsumption) {
      deptSheet.addRow([d.department, d.totalQty, d.totalValue, d.items]);
    }
    autoFitColumns(deptSheet);
  }

  // Machine Consumption Sheet
  if (report.machineConsumption.length > 0) {
    const machSheet = workbook.addWorksheet('Machine Consumption');
    addHeaderRow(machSheet, ['Machine', 'Department', 'Quantity', 'Value', 'Items']);
    
    for (const m of report.machineConsumption) {
      machSheet.addRow([m.machine, m.department || '', m.totalQty, m.totalValue, m.items]);
    }
    autoFitColumns(machSheet);
  }

  // Top Consumed Items Sheet
  if (report.topConsumedItems.length > 0) {
    const topSheet = workbook.addWorksheet('Top Consumed Items');
    addHeaderRow(topSheet, ['#', 'Item Code', 'Item Name', 'Brand', 'Unit', 'Received', 'Issued', 'Net', 'Value']);
    
    report.topConsumedItems.forEach((item, index) => {
      topSheet.addRow([index + 1, item.itemCode, item.itemName, item.brand || '', item.unit, item.totalReceived, item.totalIssued, item.netConsumption, item.estimatedValue]);
    });
    autoFitColumns(topSheet);
  }

  // Out of Stock Items Sheet
  if (report.outOfStockItems.length > 0) {
    const oosSheet = workbook.addWorksheet('Out of Stock');
    addHeaderRow(oosSheet, ['Item Code', 'Item Name', 'Brand', 'Unit', 'Min Stock', 'Days Out of Stock']);
    
    for (const item of report.outOfStockItems) {
      oosSheet.addRow([item.itemCode, item.itemName, item.brand || '', item.unit, item.minStock, item.daysOutOfStock]);
    }
    autoFitColumns(oosSheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================
// ITEMS LIST EXPORT
// ============================================================
export async function exportItemsListExcel(items: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STORE_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Items');
  sheet.addRow([STORE_NAME]);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow(['Items List']);
  sheet.getRow(2).font = { size: 12 };
  sheet.addRow([]);

  addHeaderRow(sheet, ['Item Code', 'Item Name', 'Category', 'Brand', 'Spec / Unit', 'Unit', 'Min Stock', 'Current Stock', 'Last Rate', 'Rack Location', 'Status']);

  for (const item of items) {
    sheet.addRow([
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
    ]);
  }

  autoFitColumns(sheet);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================
// ITEM LEDGER EXPORT
// ============================================================
export async function exportItemLedgerExcel(itemData: any, ledger: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STORE_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Ledger');
  sheet.addRow([STORE_NAME]);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow([`Item Ledger - ${itemData.item_code} - ${itemData.item_name}`]);
  sheet.getRow(2).font = { size: 12 };
  sheet.addRow([]);

  addHeaderRow(sheet, ['Date', 'Txn No', 'Type', 'In Qty', 'Out Qty', 'Balance', 'Rate', 'Party', 'Purpose', 'Remarks']);

  for (const entry of ledger) {
    sheet.addRow([
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
    ]);
  }

  autoFitColumns(sheet);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
