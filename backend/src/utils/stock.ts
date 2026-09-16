// Stock Management Utility Functions
// These functions handle stock calculations and transaction number generation

import prisma from '../lib/prisma';

/**
 * Recalculates current_stock for an item from transaction_items
 * This is the source of truth - current_stock should always match this calculation
 * @param itemId - The ID of the item to recalculate
 * @returns The recalculated stock quantity
 */
export async function recalculateStock(itemId: number, tx?: any): Promise<number> {
  const client = tx || prisma;
  // Get all transaction items for this item
  const transactionItems = await client.transaction_items.findMany({
    where: { item_id: itemId },
    include: {
      transaction: {
        select: {
          txn_type: true,
          is_reversed: true,
        },
      },
    },
  });

  // Calculate stock by summing quantities based on transaction type
  let stock = 0;

  for (const ti of transactionItems) {
    // Skip reversed transactions
    if (ti.transaction.is_reversed) continue;

    switch (ti.transaction.txn_type) {
      case 'IN':
      case 'RETURN':
        // These increase stock
        stock += ti.quantity;
        break;
      case 'OUT':
        // This decreases stock
        stock -= ti.quantity;
        break;
      case 'ADJUST':
        // ADJUST can be positive or negative (absolute value)
        stock += ti.quantity;
        break;
      case 'REVERSAL':
        // REVERSAL quantities are already signed: negative for IN reversals, positive for OUT reversals
        stock += ti.quantity;
        break;
    }
  }

  return stock;
}

/**
 * Generates the next transaction number for a given type and year
 * Format: TYPE-YYYY-NNNN (e.g., IN-2026-0001)
 */
export async function generateTxnNo(txnType: string, year: number, tx?: any): Promise<string> {
  const client = tx || prisma;
  const lastTxn = await client.transactions.findFirst({
    where: {
      txn_type: txnType,
      txn_date: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    orderBy: { txn_no: 'desc' },
  });

  let nextNumber = 1;
  if (lastTxn) {
    const parts = lastTxn.txn_no.split('-');
    const lastNumber = parseInt(parts[parts.length - 1], 10);
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = nextNumber.toString().padStart(4, '0');
  return `${txnType}-${year}-${paddedNumber}`;
}
