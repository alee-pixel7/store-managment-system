// PDF Export Service
// Premium "Noir + Amethyst" PDFs using pdfkit — matches the app identity

import PDFDocument from 'pdfkit';
import { formatDate } from '../utils/dates';
import type { DailyReport } from './reportService';
import type { MonthlyReport } from './monthlyReportService';

const STORE_NAME = 'STORE MANAGEMENT';
const STORE_SUB = 'Inventory Control System';

// Noir + Amethyst palette (matches the app icon / accent #8B5CF6)
const C = {
  accent: '#8B5CF6',
  accentDark: '#6D28D9',
  accentTint: '#F6F4FE',
  accentSoft: '#EDE9FE',
  lavender: '#C4B5FD',
  noir: '#141026',
  green: '#16A34A',
  red: '#DC2626',
  amber: '#D97706',
  text: '#111827',
  textLight: '#4B5563',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',
  whiteAlpha: '#FAFAFF',
  border: '#E5E7EB',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(value);
}

// TITLE BAR — Noir band + amethyst accent + logo tile
function drawTitleBar(doc: PDFKit.PDFDocument, title: string, subtitle?: string, dateStr?: string) {
  const pageW = doc.page.width;
  const barH = 68;

  doc.rect(0, 0, pageW, barH).fill(C.noir);
  doc.rect(0, barH - 4, pageW, 4).fill(C.accent);
  doc.rect(0, barH - 4, pageW / 3, 4).fill(C.accentDark);

  // Logo tile (echoes the app icon)
  doc.roundedRect(30, 15, 34, 34, 8).fill(C.accent);
  doc.roundedRect(30, 15, 34, 34, 8).lineWidth(1).stroke('#A78BFA');
  doc.font('Helvetica-Bold').fontSize(19).fillColor(C.white);
  doc.text('S', 30, 20, { width: 34, align: 'center', lineBreak: false });

  doc.font('Helvetica-Bold').fontSize(17).fillColor(C.white);
  doc.text(STORE_NAME, 76, 16, { width: pageW - 106, align: 'left', lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.lavender);
  doc.text(STORE_SUB, 76, 38, { width: pageW - 106, align: 'left', lineBreak: false });

  if (dateStr) {
    doc.font('Helvetica').fontSize(9).fillColor(C.lavender);
    doc.text(dateStr, 30, 26, { width: pageW - 60, align: 'right', lineBreak: false });
  }

  doc.y = barH + 18;

  doc.font('Helvetica-Bold').fontSize(15).fillColor(C.text);
  doc.text(title, 30, doc.y, { align: 'left' });
  doc.y += 21;

  if (subtitle) {
    doc.font('Helvetica').fontSize(9.5).fillColor(C.textLight);
    doc.text(subtitle, 30, doc.y, { align: 'left' });
    doc.y += 15;
  }

  // Modern underline: short amethyst bar + full-width hairline
  doc.rect(30, doc.y + 2, 56, 3).fill(C.accent);
  doc.rect(92, doc.y + 3, pageW - 122, 0.75).fill(C.accentSoft);
  doc.y += 16;
}

// SECTION HEADER — Rounded tick + title
function drawSectionHeader(doc: PDFKit.PDFDocument, title: string, color: string) {
  const y = doc.y;
  doc.roundedRect(30, y + 2, 9, 9, 2.5).fill(color);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text);
  doc.text(title, 46, y, { align: 'left', lineBreak: false });
  doc.y += 17;
  doc.rect(30, doc.y - 3, doc.page.width - 60, 0.5).fill(C.accentSoft);
  doc.y += 5;
}

// TABLE DRAWING — Amethyst header, soft zebra, light borders
function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: (string | number)[][],
  startY: number,
  margin: number = 30,
  colWidths?: number[],
  headerColor: string = C.accent
): number {
  const pageWidth = doc.page.width - margin * 2;
  const colWidth = colWidths || headers.map(() => pageWidth / headers.length);
  let y = startY;

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
    doc.text(header, x + 5, y + 5, { width: colWidth[i] - 10, align: 'left', lineBreak: false });
    x += colWidth[i];
  });
  y += headerHeight;

  doc.font('Helvetica').fontSize(8).fillColor(C.text);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    // New page if needed (leave room for the footer)
    if (y > doc.page.height - 62) {
      doc.addPage();
      y = 30;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white);
      doc.roundedRect(margin, y, pageWidth, headerHeight, 3).fill(headerColor);
      doc.fillColor(C.white);
      x = margin;
      headers.forEach((header, i) => {
        doc.text(header, x + 5, y + 5, { width: colWidth[i] - 10, align: 'left', lineBreak: false });
        x += colWidth[i];
      });
      y += headerHeight;
      doc.font('Helvetica').fontSize(8).fillColor(C.text);
    }

    let rowHeight = 18;
    row.forEach((cell, i) => {
      const h = doc.heightOfString(String(cell ?? ''), { width: colWidth[i] - 10 }) + 6;
      if (h > rowHeight) rowHeight = h;
    });

    // Soft amethyst zebra rows
    if (r % 2 === 0) {
      doc.rect(margin, y, pageWidth, rowHeight).fill(C.accentTint);
    }

    // Hairline bottom border
    doc.rect(margin, y + rowHeight - 0.5, pageWidth, 0.5).fill(C.border);

    // Reset text color (zebra/border fills above change pdfkit's active fill color)
    doc.font('Helvetica').fontSize(8).fillColor(C.text);

    x = margin;
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), x + 5, y + 3, { width: colWidth[i] - 10, align: 'left' });
      x += colWidth[i];
    });
    y += rowHeight;
  }

  return y + 12;
}

// SUMMARY CARDS — 2x2 grid with amethyst card styling
function drawSummaryCards(
  doc: PDFKit.PDFDocument,
  cards: { label: string; value: string; color: string }[],
  startY: number
): number {
  const margin = 30;
  const pageW = doc.page.width - margin * 2;
  const cardW = (pageW - 15) / 2;
  const cardH = 40;
  let y = startY;

  for (let i = 0; i < cards.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cardW + 15);
    const cy = y + row * (cardH + 10);
    const card = cards[i];

    doc.roundedRect(x, cy, cardW, cardH, 5).fillAndStroke(C.whiteAlpha, C.accentSoft);
    doc.roundedRect(x, cy + 7, 3.5, cardH - 14, 2).fill(card.color);

    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.text);
    doc.text(card.value, x + 15, cy + 7, { width: cardW - 22, align: 'left', lineBreak: false });

    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMuted);
    doc.text(card.label.toUpperCase(), x + 15, cy + 26, { width: cardW - 22, align: 'left', lineBreak: false });
  }

  const totalRows = Math.ceil(cards.length / 2);
  return y + totalRows * (cardH + 10) + 8;
}

// FOOTER — Amethyst line + page numbers (never overflows)
function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    const pageW = doc.page.width;
    const footerY = doc.page.height - 42;

    doc.rect(30, footerY - 7, 40, 2).fill(C.accent);
    doc.rect(74, footerY - 6.5, pageW - 104, 0.5).fill(C.accentSoft);

    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.textLight);
    doc.text(STORE_NAME, 30, footerY, { width: 200, align: 'left', lineBreak: false });

    doc.font('Helvetica').fontSize(7).fillColor(C.textMuted);
    doc.text(`Page ${i + 1} of ${range.count}`, 30, footerY, { width: pageW - 60, align: 'center', lineBreak: false });

    doc.text(formatDate(new Date()), 30, footerY, { width: pageW - 60, align: 'right', lineBreak: false });
  }
}

// DAILY REPORT PDF
export async function exportDailyReportPDF(report: DailyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawTitleBar(doc, 'Daily Stock Report', `Date: ${formatDate(report.date)}`, formatDate(report.date));

    const summaryCards = [
      { label: 'Total Receipts', value: String(report.summary.totalReceipts), color: C.green },
      { label: 'Total Issues', value: String(report.summary.totalIssues), color: C.red },
      { label: 'Receipt Qty', value: `${report.summary.totalReceiptQty} pcs`, color: C.accent },
      { label: 'Issue Qty', value: `${report.summary.totalIssueQty} pcs`, color: C.amber },
    ];
    let y = drawSummaryCards(doc, summaryCards, doc.y);
    doc.y = y;

    drawSectionHeader(doc, 'Transaction Summary', C.accent);
    const summaryRows = [
      ['Total Receipts', String(report.summary.totalReceipts), `${report.summary.totalReceiptQty} pcs`],
      ['Total Issues', String(report.summary.totalIssues), `${report.summary.totalIssueQty} pcs`],
      ['Total Returns', String(report.summary.totalReturns), `${report.summary.totalReturnQty} pcs`],
      ['Total Transactions', String(report.summary.totalTransactions), ''],
    ];
    y = drawTable(doc, ['Metric', 'Count', 'Quantity'], summaryRows, doc.y, 30);
    doc.y = y;

    if (report.receipts.length > 0) {
      drawSectionHeader(doc, 'Receipts (Stock IN)', C.green);
      const receiptRows = report.receipts.map((r) => [
        `${r.itemCode} - ${r.itemName}`,
        String(r.qty),
        formatCurrency(r.rate),
        formatCurrency(r.total),
        r.supplier,
      ]);
      y = drawTable(doc, ['Item', 'Qty', 'Rate', 'Total', 'Supplier'], receiptRows, doc.y, 30);
      doc.y = y;
    }

    if (report.issues.length > 0) {
      drawSectionHeader(doc, 'Issues (Stock OUT)', C.red);
      const issueRows = report.issues.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        String(i.qty),
        i.issuedTo,
        i.department || '-',
        i.purpose,
      ]);
      y = drawTable(doc, ['Item', 'Qty', 'Issued To', 'Dept', 'Purpose'], issueRows, doc.y, 30);
      doc.y = y;
    }

    if (report.itemsBelowMinimum.length > 0) {
      drawSectionHeader(doc, 'Items Below Minimum Stock', C.amber);
      const belowMinRows = report.itemsBelowMinimum.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        `${i.currentStock} ${i.unit}`,
        `${i.minStock} ${i.unit}`,
        `${i.minStock - i.currentStock} ${i.unit}`,
      ]);
      y = drawTable(doc, ['Item', 'Current', 'Min', 'Deficit'], belowMinRows, doc.y, 30);
      doc.y = y;
    }

    addPageNumbers(doc);
    doc.end();
  });
}

// MONTHLY REPORT PDF
export async function exportMonthlyReportPDF(report: MonthlyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawTitleBar(doc, 'Monthly Stock Report', `${report.monthName} ${report.year}`, `${report.monthName} ${report.year}`);

    const summaryCards = [
      { label: 'Total Received', value: String(report.summary.totalReceived), color: C.green },
      { label: 'Total Issued', value: String(report.summary.totalIssued), color: C.red },
      { label: 'Received Value', value: formatCurrency(report.summary.totalReceivedValue), color: C.accent },
      { label: 'Issued Value', value: formatCurrency(report.summary.totalIssuedValue), color: C.amber },
    ];
    let y = drawSummaryCards(doc, summaryCards, doc.y);
    doc.y = y;

    drawSectionHeader(doc, 'Transaction Summary', C.accent);
    const summaryRows = [
      ['Total Received', String(report.summary.totalReceived), formatCurrency(report.summary.totalReceivedValue)],
      ['Total Issued', String(report.summary.totalIssued), formatCurrency(report.summary.totalIssuedValue)],
      ['Total Returned', String(report.summary.totalReturned), formatCurrency(report.summary.totalReturnedValue)],
      ['Total Transactions', String(report.summary.totalTransactions), ''],
      ['Opening Stock Value', '', formatCurrency(report.stockValue.opening)],
      ['Closing Stock Value', '', formatCurrency(report.stockValue.closing)],
    ];
    y = drawTable(doc, ['Metric', 'Count', 'Value'], summaryRows, doc.y, 30);
    doc.y = y;

    if (report.departmentConsumption.length > 0) {
      drawSectionHeader(doc, 'Department-wise Consumption', C.red);
      const deptRows = report.departmentConsumption.map((d) => [
        d.department,
        String(d.totalQty),
        formatCurrency(d.totalValue),
        String(d.items),
      ]);
      y = drawTable(doc, ['Department', 'Qty', 'Value', 'Items'], deptRows, doc.y, 30);
      doc.y = y;
    }

    if (report.machineConsumption.length > 0) {
      drawSectionHeader(doc, 'Machine-wise Consumption', C.amber);
      const machRows = report.machineConsumption.map((m) => [
        m.machine,
        m.department || '-',
        String(m.totalQty),
        formatCurrency(m.totalValue),
        String(m.items),
      ]);
      y = drawTable(doc, ['Machine', 'Dept', 'Qty', 'Value', 'Items'], machRows, doc.y, 30);
      doc.y = y;
    }

    if (report.topConsumedItems.length > 0) {
      drawSectionHeader(doc, 'Top 20 Most Consumed Items', C.accent);
      const topRows = report.topConsumedItems.map((item, index) => [
        String(index + 1),
        `${item.itemCode} - ${item.itemName}`,
        String(item.totalReceived),
        String(item.totalIssued),
        String(item.netConsumption),
        formatCurrency(item.estimatedValue),
      ]);
      y = drawTable(doc, ['#', 'Item', 'Received', 'Issued', 'Net', 'Value'], topRows, doc.y, 30);
      doc.y = y;
    }

    if (report.outOfStockItems.length > 0) {
      drawSectionHeader(doc, 'Items Out of Stock During Month', C.red);
      const oosRows = report.outOfStockItems.map((i) => [
        `${i.itemCode} - ${i.itemName}`,
        `${i.minStock} ${i.unit}`,
        `${i.daysOutOfStock} days`,
      ]);
      y = drawTable(doc, ['Item', 'Min Stock', 'Days OOS'], oosRows, doc.y, 30);
      doc.y = y;
    }

    addPageNumbers(doc);
    doc.end();
  });
}

// ITEMS LIST PDF
export async function exportItemsListPDF(items: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawTitleBar(doc, 'Items List', `${items.length} items in inventory`);

    drawSectionHeader(doc, 'All Items', C.accent);
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
    drawTable(doc, ['Code', 'Name', 'Category', 'Brand', 'Spec', 'Unit', 'Stock', 'Min', 'Location'], itemRows, doc.y, 30, [50, 125, 60, 45, 75, 30, 35, 30, 45]);

    addPageNumbers(doc);
    doc.end();
  });
}

// ITEM LEDGER PDF
export async function exportItemLedgerPDF(itemData: any, ledger: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawTitleBar(doc, `Item Ledger — ${itemData.item_code}`, itemData.item_name);

    drawSectionHeader(doc, 'Item Information', C.accent);
    const infoCards = [
      { label: 'Item Code', value: itemData.item_code, color: C.accent },
      { label: 'Brand', value: itemData.brand || '-', color: C.green },
      { label: 'Unit', value: itemData.unit, color: C.amber },
      { label: 'Current Stock', value: String(itemData.current_stock), color: C.red },
    ];
    let y = drawSummaryCards(doc, infoCards, doc.y);
    doc.y = y;

    drawSectionHeader(doc, 'Transaction Ledger', C.accent);
    const ledgerRows = ledger.map((e) => [
      formatDate(e.date),
      e.txn_no,
      e.txn_type,
      e.in_qty != null ? String(e.in_qty) : '',
      e.out_qty != null ? String(e.out_qty) : '',
      String(e.running_balance),
      e.party || '',
    ]);
    drawTable(doc, ['Date', 'Txn No', 'Type', 'In', 'Out', 'Balance', 'Party'], ledgerRows, doc.y, 30);

    addPageNumbers(doc);
    doc.end();
  });
}
