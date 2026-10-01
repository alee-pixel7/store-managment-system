// PDF Export Service
// Premium dark-themed PDFs using pdfkit

import PDFDocument from 'pdfkit';
import { formatDate } from '../utils/dates';
import type { DailyReport } from './reportService';
import type { MonthlyReport } from './monthlyReportService';

const STORE_NAME = 'STORE MANAGEMENT';
const STORE_SUB = 'Inventory Control System';

const C = {
  gold: '#E8A035',
  goldDark: '#D4922E',
  goldLight: '#FAF5EE',
  green: '#4ADE80',
  greenDark: '#22C55E',
  red: '#EF4444',
  redDark: '#DC2626',
  amber: '#F59E0B',
  amberDark: '#D97706',
  text: '#1A1D23',
  textLight: '#666E7A',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',
  whiteAlpha: '#F9FAFB',
  border: '#E5E7EB',
};

// ============================================================
// FORMAT HELPERS
// ============================================================
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(value);
}

// ============================================================
// TITLE BAR — Gold gradient header
// ============================================================
function drawTitleBar(doc: PDFKit.PDFDocument, title: string, subtitle?: string, dateStr?: string) {
  const pageW = doc.page.width;
  const barH = 65;

  // Gold gradient bar (solid approximation)
  doc.rect(0, 0, pageW, barH).fill(C.gold);
  doc.rect(0, barH - 3, pageW, 3).fill(C.goldDark);

  // Store name
  doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white);
  doc.text(STORE_NAME, 30, 15, { width: pageW - 60, align: 'left' });
  doc.font('Helvetica').fontSize(9).fillColor(C.whiteAlpha);
  doc.text(STORE_SUB, 30, 36, { width: pageW - 60, align: 'left' });

  // Date on right
  if (dateStr) {
    doc.font('Helvetica').fontSize(9).fillColor(C.white);
    doc.text(dateStr, 30, 15, { width: pageW - 60, align: 'right' });
  }

  doc.y = barH + 15;

  // Report title
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C.text);
  doc.text(title, 30, doc.y, { align: 'left' });
  doc.y += 22;

  if (subtitle) {
    doc.font('Helvetica').fontSize(10).fillColor(C.textLight);
    doc.text(subtitle, 30, doc.y, { align: 'left' });
    doc.y += 16;
  }

  // Gold accent line
  doc.rect(30, doc.y, pageW - 60, 1.5).fill(C.gold);
  doc.y += 15;
}

// ============================================================
// SECTION HEADER — Colored bullet + title
// ============================================================
function drawSectionHeader(doc: PDFKit.PDFDocument, title: string, color: string) {
  const y = doc.y;
  // Bullet dot
  doc.circle(34, y + 6, 3).fill(color);
  // Title
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text);
  doc.text(title, 44, y, { align: 'left' });
  doc.y += 18;

  // Subtle line under section
  doc.rect(30, doc.y - 3, doc.page.width - 60, 0.5).fill(C.border);
  doc.y += 5;
}

// ============================================================
// TABLE DRAWING — Premium with colored headers
// ============================================================
function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: (string | number)[][],
  startY: number,
  margin: number = 30,
  colWidths?: number[],
  headerColor: string = C.gold
): number {
  const pageWidth = doc.page.width - margin * 2;
  const colWidth = colWidths || headers.map(() => pageWidth / headers.length);
  let y = startY;

  // Header
  let headerHeight = 20;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white);
  headers.forEach((header, i) => {
    const h = doc.heightOfString(header, { width: colWidth[i] - 8 }) + 10;
    if (h > headerHeight) headerHeight = h;
  });
  doc.roundedRect(margin, y, pageWidth, headerHeight, 3).fill(headerColor);
  doc.fillColor(C.white);
  let x = margin;
  headers.forEach((header, i) => {
    doc.text(header, x + 5, y + 5, { width: colWidth[i] - 10, align: 'left' });
    x += colWidth[i];
  });
  y += headerHeight;

  // Rows
  doc.font('Helvetica').fontSize(8).fillColor(C.text);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    // Check if we need a new page
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = 30;
      // Re-draw header
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white);
      doc.roundedRect(margin, y, pageWidth, headerHeight, 3).fill(headerColor);
      doc.fillColor(C.white);
      x = margin;
      headers.forEach((header, i) => {
        doc.text(header, x + 5, y + 5, { width: colWidth[i] - 10, align: 'left' });
        x += colWidth[i];
      });
      y += headerHeight;
      doc.font('Helvetica').fontSize(8).fillColor(C.text);
    }

    // Calculate row height
    let rowHeight = 18;
    row.forEach((cell, i) => {
      const h = doc.heightOfString(String(cell ?? ''), { width: colWidth[i] - 10 }) + 6;
      if (h > rowHeight) rowHeight = h;
    });

    // Alternating warm rows
    if (r % 2 === 0) {
      doc.roundedRect(margin, y, pageWidth, rowHeight, 0).fill(C.goldLight);
    }

    // Row left accent bar (subtle)
    if (r % 2 === 0) {
      doc.rect(margin, y, 1.5, rowHeight).fill(headerColor + '40');
    }

    x = margin;
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), x + 5, y + 3, { width: colWidth[i] - 10, align: 'left' });
      x += colWidth[i];
    });
    y += rowHeight;
  }

  return y + 12;
}

// ============================================================
// SUMMARY CARDS — 2x2 grid for daily report
// ============================================================
function drawSummaryCards(
  doc: PDFKit.PDFDocument,
  cards: { label: string; value: string; color: string }[],
  startY: number
): number {
  const margin = 30;
  const pageW = doc.page.width - margin * 2;
  const cardW = (pageW - 15) / 2;
  const cardH = 38;
  let y = startY;

  for (let i = 0; i < cards.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cardW + 15);
    const cy = y + row * (cardH + 10);
    const card = cards[i];

    // Card background
    doc.roundedRect(x, cy, cardW, cardH, 4).fill(C.whiteAlpha);
    doc.rect(x, cy, 3, cardH).fill(card.color);

    // Value (big number)
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.text);
    doc.text(card.value, x + 14, cy + 6, { width: cardW - 20, align: 'left' });

    // Label
    doc.font('Helvetica').fontSize(8).fillColor(C.textLight);
    doc.text(card.label, x + 14, cy + 24, { width: cardW - 20, align: 'left' });
  }

  const totalRows = Math.ceil(cards.length / 2);
  return y + totalRows * (cardH + 10) + 8;
}

// ============================================================
// FOOTER — Premium with gold line
// ============================================================
function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    const pageW = doc.page.width;
    const footerY = doc.page.height - 35;

    // Gold line
    doc.rect(30, footerY - 5, pageW - 60, 0.5).fill(C.gold);

    // Store name left
    doc.font('Helvetica').fontSize(7).fillColor(C.textLight);
    doc.text(STORE_NAME, 30, footerY, { width: 150, align: 'left' });

    // Page number center
    doc.text(`Page ${i + 1} of ${range.count}`, 30, footerY, { width: pageW - 60, align: 'center' });

    // Date right
    doc.text(formatDate(new Date()), 30, footerY, { width: pageW - 60, align: 'right' });
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

    // Title bar
    drawTitleBar(doc, 'Daily Stock Report', `Date: ${formatDate(report.date)}`, formatDate(report.date));

    // Summary cards
    const summaryCards = [
      { label: 'Total Receipts', value: String(report.summary.totalReceipts), color: C.green },
      { label: 'Total Issues', value: String(report.summary.totalIssues), color: C.red },
      { label: 'Receipt Qty', value: `${report.summary.totalReceiptQty} pcs`, color: C.gold },
      { label: 'Issue Qty', value: `${report.summary.totalIssueQty} pcs`, color: C.amber },
    ];
    let y = drawSummaryCards(doc, summaryCards, doc.y);

    // Summary table
    drawSectionHeader(doc, 'Transaction Summary', C.gold);
    const summaryRows = [
      ['Total Receipts', String(report.summary.totalReceipts), `${report.summary.totalReceiptQty} pcs`],
      ['Total Issues', String(report.summary.totalIssues), `${report.summary.totalIssueQty} pcs`],
      ['Total Returns', String(report.summary.totalReturns), `${report.summary.totalReturnQty} pcs`],
      ['Total Transactions', String(report.summary.totalTransactions), ''],
    ];
    y = drawTable(doc, ['Metric', 'Count', 'Quantity'], summaryRows, doc.y, 30, undefined, C.gold);
    doc.y = y;

    // Receipts
    if (report.receipts.length > 0) {
      drawSectionHeader(doc, 'Receipts (Stock IN)', C.green);
      const receiptRows = report.receipts.map((r) => [
        `${r.itemCode} - ${r.itemName}`,
        String(r.qty),
        formatCurrency(r.rate),
        formatCurrency(r.total),
        r.supplier,
      ]);
      y = drawTable(doc, ['Item', 'Qty', 'Rate', 'Total', 'Supplier'], receiptRows, doc.y, 30, undefined, C.green);
      doc.y = y;
    }

    // Issues
    if (report.issues.length > 0) {
      drawSectionHeader(doc, 'Issues (Stock OUT)', C.red);
      const issueRows = report.issues.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        String(i.qty),
        i.issuedTo,
        i.department || '-',
        i.purpose,
      ]);
      y = drawTable(doc, ['Item', 'Qty', 'Issued To', 'Dept', 'Purpose'], issueRows, doc.y, 30, undefined, C.red);
      doc.y = y;
    }

    // Items Below Minimum
    if (report.itemsBelowMinimum.length > 0) {
      drawSectionHeader(doc, 'Items Below Minimum Stock', C.amber);
      const belowMinRows = report.itemsBelowMinimum.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        `${i.currentStock} ${i.unit}`,
        `${i.minStock} ${i.unit}`,
        `${i.minStock - i.currentStock} ${i.unit}`,
      ]);
      y = drawTable(doc, ['Item', 'Current', 'Min', 'Deficit'], belowMinRows, doc.y, 30, undefined, C.amber);
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

    // Title bar
    drawTitleBar(doc, 'Monthly Stock Report', `${report.monthName} ${report.year}`, `${report.monthName} ${report.year}`);

    // Summary cards
    const summaryCards = [
      { label: 'Total Received', value: String(report.summary.totalReceived), color: C.green },
      { label: 'Total Issued', value: String(report.summary.totalIssued), color: C.red },
      { label: 'Received Value', value: formatCurrency(report.summary.totalReceivedValue), color: C.gold },
      { label: 'Issued Value', value: formatCurrency(report.summary.totalIssuedValue), color: C.amber },
    ];
    let y = drawSummaryCards(doc, summaryCards, doc.y);

    // Summary table
    drawSectionHeader(doc, 'Transaction Summary', C.gold);
    const summaryRows = [
      ['Total Received', String(report.summary.totalReceived), formatCurrency(report.summary.totalReceivedValue)],
      ['Total Issued', String(report.summary.totalIssued), formatCurrency(report.summary.totalIssuedValue)],
      ['Total Returned', String(report.summary.totalReturned), formatCurrency(report.summary.totalReturnedValue)],
      ['Total Transactions', String(report.summary.totalTransactions), ''],
      ['Opening Stock Value', '', formatCurrency(report.stockValue.opening)],
      ['Closing Stock Value', '', formatCurrency(report.stockValue.closing)],
    ];
    y = drawTable(doc, ['Metric', 'Count', 'Value'], summaryRows, doc.y, 30, undefined, C.gold);
    doc.y = y;

    // Department Consumption
    if (report.departmentConsumption.length > 0) {
      drawSectionHeader(doc, 'Department-wise Consumption', C.red);
      const deptRows = report.departmentConsumption.map((d) => [
        d.department,
        String(d.totalQty),
        formatCurrency(d.totalValue),
        String(d.items),
      ]);
      y = drawTable(doc, ['Department', 'Qty', 'Value', 'Items'], deptRows, doc.y, 30, undefined, C.red);
      doc.y = y;
    }

    // Machine Consumption
    if (report.machineConsumption.length > 0) {
      drawSectionHeader(doc, 'Machine-wise Consumption', C.amber);
      const machRows = report.machineConsumption.map((m) => [
        m.machine,
        m.department || '-',
        String(m.totalQty),
        formatCurrency(m.totalValue),
        String(m.items),
      ]);
      y = drawTable(doc, ['Machine', 'Dept', 'Qty', 'Value', 'Items'], machRows, doc.y, 30, undefined, C.amber);
      doc.y = y;
    }

    // Top Consumed Items
    if (report.topConsumedItems.length > 0) {
      drawSectionHeader(doc, 'Top 20 Most Consumed Items', C.gold);
      const topRows = report.topConsumedItems.map((item, index) => [
        String(index + 1),
        `${item.itemCode} - ${item.itemName}`,
        String(item.totalReceived),
        String(item.totalIssued),
        String(item.netConsumption),
        formatCurrency(item.estimatedValue),
      ]);
      y = drawTable(doc, ['#', 'Item', 'Received', 'Issued', 'Net', 'Value'], topRows, doc.y, 30, undefined, C.gold);
      doc.y = y;
    }

    // Out of Stock Items
    if (report.outOfStockItems.length > 0) {
      drawSectionHeader(doc, 'Items Out of Stock During Month', C.red);
      const oosRows = report.outOfStockItems.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        `${i.minStock} ${i.unit}`,
        `${i.daysOutOfStock} days`,
      ]);
      y = drawTable(doc, ['Item', 'Min Stock', 'Days OOS'], oosRows, doc.y, 30, undefined, C.red);
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

    // Title bar
    drawTitleBar(doc, 'Items List', `${items.length} items in inventory`);

    // Items table
    drawSectionHeader(doc, 'All Items', C.gold);
    const itemRows = items.map((i) => [
      i.item_code,
      i.item_name,
      i.category?.name || '-',
      i.brand || '-',
      i.spec || '-',
      i.unit,
      String(i.current_stock),
      String(i.min_stock),
      i.rack_location || '-',
    ]);
    drawTable(doc, ['Code', 'Name', 'Category', 'Brand', 'Spec / Unit', 'Unit', 'Stock', 'Min', 'Location'], itemRows, doc.y, 30, [50, 125, 60, 45, 75, 30, 35, 30, 45], C.gold);

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

    // Title bar
    drawTitleBar(doc, `Item Ledger — ${itemData.item_code}`, itemData.item_name);

    // Item info card
    drawSectionHeader(doc, 'Item Information', C.gold);
    const infoCards = [
      { label: 'Item Code', value: itemData.item_code, color: C.gold },
      { label: 'Brand', value: itemData.brand || '-', color: C.green },
      { label: 'Unit', value: itemData.unit, color: C.amber },
      { label: 'Current Stock', value: String(itemData.current_stock), color: C.red },
    ];
    let y = drawSummaryCards(doc, infoCards, doc.y);

    // Ledger
    drawSectionHeader(doc, 'Transaction Ledger', C.gold);
    const ledgerRows = ledger.map((e) => [
      formatDate(e.date),
      e.txn_no,
      e.txn_type,
      e.in_qty != null ? String(e.in_qty) : '',
      e.out_qty != null ? String(e.out_qty) : '',
      String(e.running_balance),
      e.party || '',
    ]);
    drawTable(doc, ['Date', 'Txn No', 'Type', 'In', 'Out', 'Balance', 'Party'], ledgerRows, doc.y, 30, undefined, C.gold);

    addPageNumbers(doc);
    doc.end();
  });
}
