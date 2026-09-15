// PDF Export Service
// Generates PDF files using pdfkit (reliable server-side)

import PDFDocument from 'pdfkit';
import type { DailyReport } from './reportService';
import type { MonthlyReport } from './monthlyReportService';

const STORE_NAME = 'Store Management System';

// ============================================================
// STYLE HELPERS
// ============================================================
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(value);
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: (string | number)[][], startY: number, margin: number = 30): number {
  const pageWidth = doc.page.width - margin * 2;
  const colWidth = pageWidth / headers.length;
  let y = startY;

  // Header
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
  doc.rect(margin, y, pageWidth, 18).fill('#2563EB');
  doc.fillColor('#FFFFFF');
  headers.forEach((header, i) => {
    doc.text(header, margin + i * colWidth + 4, y + 4, { width: colWidth - 8, align: 'left' });
  });
  y += 18;

  // Rows
  doc.font('Helvetica').fontSize(8).fillColor('#000000');
  for (const row of rows) {
    // Check if we need a new page
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = 30;
      // Re-draw header
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      doc.rect(margin, y, pageWidth, 18).fill('#2563EB');
      doc.fillColor('#FFFFFF');
      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth + 4, y + 4, { width: colWidth - 8, align: 'left' });
      });
      y += 18;
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
    }

    // Alternating row background
    if (rows.indexOf(row) % 2 === 0) {
      doc.rect(margin, y, pageWidth, 16).fill('#F3F4F6');
      doc.fillColor('#000000');
    }

    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), margin + i * colWidth + 4, y + 2, { width: colWidth - 8, align: 'left' });
    });
    y += 16;
  }

  return y + 10;
}

function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor('#666666');
    doc.text(
      `Page ${i + 1} of ${range.count}`,
      30,
      doc.page.height - 40,
      { width: doc.page.width - 60, align: 'center' }
    );
  }
}

// ============================================================
// DAILY REPORT PDF
// ============================================================
export async function exportDailyReportPDF(report: DailyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(STORE_NAME, 30, 30, { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(14).text('Daily Stock Report', { align: 'center' });
    doc.font('Helvetica').fontSize(11).fillColor('#666666').text(report.date, { align: 'center' });
    doc.font('Helvetica').fontSize(8).text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('Summary');
    doc.moveDown(0.5);
    const summaryRows = [
      ['Total Receipts', String(report.summary.totalReceipts), `${report.summary.totalReceiptQty} pcs`],
      ['Total Issues', String(report.summary.totalIssues), `${report.summary.totalIssueQty} pcs`],
      ['Total Returns', String(report.summary.totalReturns), `${report.summary.totalReturnQty} pcs`],
      ['Total Transactions', String(report.summary.totalTransactions), ''],
    ];
    let y = drawTable(doc, ['Metric', 'Count', 'Quantity'], summaryRows, doc.y);
    doc.y = y;

    // Receipts
    if (report.receipts.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('Receipts (Stock IN)');
      doc.moveDown(0.5);
      const receiptRows = report.receipts.map((r) => [
        `${r.itemCode} - ${r.itemName}`,
        String(r.qty),
        formatCurrency(r.rate),
        formatCurrency(r.total),
        r.supplier,
      ]);
      y = drawTable(doc, ['Item', 'Qty', 'Rate', 'Total', 'Supplier'], receiptRows, doc.y);
      doc.y = y;
    }

    // Issues
    if (report.issues.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('Issues (Stock OUT)');
      doc.moveDown(0.5);
      const issueRows = report.issues.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        String(i.qty),
        i.issuedTo,
        i.department || '-',
        i.purpose,
      ]);
      y = drawTable(doc, ['Item', 'Qty', 'Issued To', 'Dept', 'Purpose'], issueRows, doc.y);
      doc.y = y;
    }

    // Items Below Minimum
    if (report.itemsBelowMinimum.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#DC2626').text('Items Below Minimum Stock');
      doc.moveDown(0.5);
      const belowMinRows = report.itemsBelowMinimum.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        `${i.currentStock} ${i.unit}`,
        `${i.minStock} ${i.unit}`,
        `${i.minStock - i.currentStock} ${i.unit}`,
      ]);
      y = drawTable(doc, ['Item', 'Current', 'Min', 'Deficit'], belowMinRows, doc.y);
    }

    addPageNumbers(doc);
    doc.end();
  });
}

// ============================================================
// MONTHLY REPORT PDF
// ============================================================
export async function exportMonthlyReportPDF(report: MonthlyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(STORE_NAME, 30, 30, { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(14).text('Monthly Stock Report', { align: 'center' });
    doc.font('Helvetica').fontSize(11).fillColor('#666666').text(`${report.monthName} ${report.year}`, { align: 'center' });
    doc.font('Helvetica').fontSize(8).text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('Summary');
    doc.moveDown(0.5);
    const summaryRows = [
      ['Total Received', String(report.summary.totalReceived), formatCurrency(report.summary.totalReceivedValue)],
      ['Total Issued', String(report.summary.totalIssued), formatCurrency(report.summary.totalIssuedValue)],
      ['Total Returned', String(report.summary.totalReturned), formatCurrency(report.summary.totalReturnedValue)],
      ['Total Transactions', String(report.summary.totalTransactions), ''],
      ['Opening Stock Value', '', formatCurrency(report.stockValue.opening)],
      ['Closing Stock Value', '', formatCurrency(report.stockValue.closing)],
    ];
    let y = drawTable(doc, ['Metric', 'Count', 'Value'], summaryRows, doc.y);
    doc.y = y;

    // Department Consumption
    if (report.departmentConsumption.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('Department-wise Consumption');
      doc.moveDown(0.5);
      const deptRows = report.departmentConsumption.map((d) => [
        d.department,
        String(d.totalQty),
        formatCurrency(d.totalValue),
        String(d.items),
      ]);
      y = drawTable(doc, ['Department', 'Qty', 'Value', 'Items'], deptRows, doc.y);
      doc.y = y;
    }

    // Machine Consumption
    if (report.machineConsumption.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('Machine-wise Consumption');
      doc.moveDown(0.5);
      const machRows = report.machineConsumption.map((m) => [
        m.machine,
        m.department || '-',
        String(m.totalQty),
        formatCurrency(m.totalValue),
        String(m.items),
      ]);
      y = drawTable(doc, ['Machine', 'Dept', 'Qty', 'Value', 'Items'], machRows, doc.y);
      doc.y = y;
    }

    // Top Consumed Items
    if (report.topConsumedItems.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('Top 20 Most Consumed Items');
      doc.moveDown(0.5);
      const topRows = report.topConsumedItems.map((item, index) => [
        String(index + 1),
        `${item.itemCode} - ${item.itemName}`,
        String(item.totalReceived),
        String(item.totalIssued),
        String(item.netConsumption),
        formatCurrency(item.estimatedValue),
      ]);
      y = drawTable(doc, ['#', 'Item', 'Received', 'Issued', 'Net', 'Value'], topRows, doc.y);
      doc.y = y;
    }

    // Out of Stock Items
    if (report.outOfStockItems.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#DC2626').text('Items Out of Stock During Month');
      doc.moveDown(0.5);
      const oosRows = report.outOfStockItems.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        `${i.minStock} ${i.unit}`,
        `${i.daysOutOfStock} days`,
      ]);
      y = drawTable(doc, ['Item', 'Min Stock', 'Days OOS'], oosRows, doc.y);
    }

    addPageNumbers(doc);
    doc.end();
  });
}

// ============================================================
// ITEMS LIST PDF
// ============================================================
export async function exportItemsListPDF(items: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(STORE_NAME, 30, 30, { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(14).text('Items List', { align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#666666').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(2);

    // Items table
    const itemRows = items.map((i) => [
      i.item_code,
      i.item_name,
      i.brand || '',
      i.unit,
      String(i.min_stock),
      String(i.current_stock),
      i.last_rate ? formatCurrency(i.last_rate) : '-',
      i.rack_location || '',
    ]);
    drawTable(doc, ['Code', 'Name', 'Brand', 'Unit', 'Min', 'Stock', 'Rate', 'Location'], itemRows, doc.y);

    addPageNumbers(doc);
    doc.end();
  });
}

// ============================================================
// ITEM LEDGER PDF
// ============================================================
export async function exportItemLedgerPDF(itemData: any, ledger: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(STORE_NAME, 30, 30, { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(14).text(`Item Ledger - ${itemData.item_code}`, { align: 'center' });
    doc.font('Helvetica').fontSize(11).fillColor('#666666').text(itemData.item_name, { align: 'center' });
    doc.font('Helvetica').fontSize(8).text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(2);

    // Item Info
    const infoRows = [
      [itemData.item_code, itemData.brand || '-', itemData.unit, String(itemData.current_stock)],
    ];
    let y = drawTable(doc, ['Item Code', 'Brand', 'Unit', 'Current Stock'], infoRows, doc.y);
    doc.y = y;

    // Ledger
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('Transaction Ledger');
    doc.moveDown(0.5);
    const ledgerRows = ledger.map((e) => [
      new Date(e.date).toLocaleDateString('en-IN'),
      e.txn_no,
      e.txn_type,
      e.in_qty != null ? String(e.in_qty) : '',
      e.out_qty != null ? String(e.out_qty) : '',
      String(e.running_balance),
      e.party || '',
    ]);
    drawTable(doc, ['Date', 'Txn No', 'Type', 'In', 'Out', 'Balance', 'Party'], ledgerRows, doc.y);

    addPageNumbers(doc);
    doc.end();
  });
}
