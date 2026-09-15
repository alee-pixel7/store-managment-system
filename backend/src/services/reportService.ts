// Daily Report Service Layer
// Generates daily transaction reports with receipts, issues, and stock alerts

import prisma from '../lib/prisma';

export interface DailyReport {
  date: string;
  summary: {
    totalReceipts: number;
    totalIssues: number;
    totalReturns: number;
    totalTransactions: number;
    totalReceiptQty: number;
    totalIssueQty: number;
    totalReturnQty: number;
  };
  receipts: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    qty: number;
    rate: number;
    total: number;
    supplier: string;
    invoiceNo: string;
    txnNo: string;
  }>;
  issues: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    qty: number;
    issuedTo: string;
    department: string | null;
    machine: string | null;
    purpose: string;
    txnNo: string;
  }>;
  itemsBelowMinimum: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    currentStock: number;
    minStock: number;
    unit: string;
  }>;
}

export async function getDailyReport(dateStr: string): Promise<DailyReport> {
  // Parse the date and create start/end of day
  const date = new Date(dateStr);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all transactions for the day
  const transactions = await prisma.transactions.findMany({
    where: {
      txn_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      is_reversed: false, // Exclude reversed transactions
    },
    include: {
      transaction_items: {
        include: {
          item: true,
        },
      },
      supplier: { select: { name: true } },
      person: { select: { name: true } },
      department: { select: { name: true } },
      machine: { select: { name: true, code: true } },
    },
    orderBy: {
      txn_no: 'asc',
    },
  });

  // Categorize transactions
  const receipts: DailyReport['receipts'] = [];
  const issues: DailyReport['issues'] = [];
  
  let totalReceiptQty = 0;
  let totalIssueQty = 0;
  let totalReturnQty = 0;

  for (const txn of transactions) {
    if (txn.txn_type === 'IN') {
      // Receipts
      for (const item of txn.transaction_items) {
        const qty = item.quantity;
        const rate = item.rate || 0;
        receipts.push({
          itemCode: item.item.item_code,
          itemName: item.item.item_name,
          brand: item.item.brand,
          qty,
          rate,
          total: qty * rate,
          supplier: txn.supplier?.name || '-',
          invoiceNo: txn.invoice_no || '-',
          txnNo: txn.txn_no,
        });
        totalReceiptQty += qty;
      }
    } else if (txn.txn_type === 'OUT') {
      // Issues
      for (const item of txn.transaction_items) {
        const qty = item.quantity;
        
        // Build issued to string
        const parts: string[] = [];
        if (txn.person) parts.push(txn.person.name);
        if (txn.department) parts.push(txn.department.name);
        if (txn.machine) {
          parts.push(txn.machine.code || txn.machine.name);
        }
        
        issues.push({
          itemCode: item.item.item_code,
          itemName: item.item.item_name,
          brand: item.item.brand,
          qty,
          issuedTo: parts.join(' / ') || txn.person?.name || '-',
          department: txn.department?.name || null,
          machine: txn.machine?.code || txn.machine?.name || null,
          purpose: txn.purpose || '-',
          txnNo: txn.txn_no,
        });
        totalIssueQty += qty;
      }
    } else if (txn.txn_type === 'RETURN') {
      // Returns (count as negative issues)
      for (const item of txn.transaction_items) {
        const qty = item.quantity;
        totalReturnQty += qty;
      }
    }
  }

  // Find items that crossed below minimum stock on this day
  const itemsBelowMinimum = await findItemsBelowMinimum(startOfDay, endOfDay);

  // Calculate summary
  const totalReceipts = receipts.length;
  const totalIssues = issues.length;
  const totalReturns = transactions.filter(t => t.txn_type === 'RETURN').length;
  const totalTransactions = transactions.length;

  return {
    date: dateStr,
    summary: {
      totalReceipts,
      totalIssues,
      totalReturns,
      totalTransactions,
      totalReceiptQty,
      totalIssueQty,
      totalReturnQty,
    },
    receipts,
    issues,
    itemsBelowMinimum,
  };
}

async function findItemsBelowMinimum(
  startOfDay: Date,
  endOfDay: Date
): Promise<DailyReport['itemsBelowMinimum']> {
  // Get all active items with minimum stock set
  const items = await prisma.items.findMany({
    where: {
      is_active: true,
      min_stock: {
        gt: 0,
      },
    },
  });

  const belowMinimum: DailyReport['itemsBelowMinimum'] = [];

  for (const item of items) {
    // Get stock at start of day
    const stockAtStart = await calculateStockAtTime(item.id, startOfDay);
    
    // Get stock at end of day
    const stockAtEnd = await calculateStockAtTime(item.id, endOfDay);

    // Item crossed below minimum if it was above at start and below at end
    const wasAboveOrAtMinimum = stockAtStart >= item.min_stock;
    const isBelowMinimum = stockAtEnd < item.min_stock;

    if (wasAboveOrAtMinimum && isBelowMinimum) {
      belowMinimum.push({
        itemCode: item.item_code,
        itemName: item.item_name,
        brand: item.brand,
        currentStock: stockAtEnd,
        minStock: item.min_stock,
        unit: item.unit,
      });
    }
  }

  return belowMinimum;
}

async function calculateStockAtTime(itemId: number, beforeTime: Date): Promise<number> {
  const result = await prisma.transaction_items.aggregate({
    where: {
      item_id: itemId,
      transaction: {
        txn_date: {
          lt: beforeTime,
        },
        is_reversed: false,
      },
    },
    _sum: {
      quantity: true,
    },
  });

  return result._sum.quantity || 0;
}
