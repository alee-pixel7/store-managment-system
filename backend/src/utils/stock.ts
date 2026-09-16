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
 * @param txnType - The transaction type (IN, OUT, RETURN, ADJUST, REVERSAL)
 * @param year - The year for the transaction
 * @returns The next transaction number
 */
export async function generateTxnNo(txnType: string, year: number, tx?: any): Promise<string> {
  const client = tx || prisma;
  // Find the last transaction of this type in this year
  const lastTxn = await client.transactions.findFirst({
    where: {
      txn_type: txnType,
      txn_date: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    orderBy: {
      txn_no: 'desc',
    },
  });

  let nextNumber = 1;

  if (lastTxn) {
    // Extract the number from the last transaction number
    const parts = lastTxn.txn_no.split('-');
    const lastNumber = parseInt(parts[parts.length - 1], 10);
    nextNumber = lastNumber + 1;
  }

  // Format with leading zeros (4 digits)
  const paddedNumber = nextNumber.toString().padStart(4, '0');

  return `${txnType}-${year}-${paddedNumber}`;
}

/**
 * Creates a new transaction with items in a single database transaction
 * This ensures atomicity - either both succeed or both fail
 * @param transactionData - The transaction header data
 * @param items - Array of transaction items
 * @returns The created transaction with its items
 */
export async function createTransaction(
  transactionData: {
    txn_type: string;
    supplier_id?: number;
    invoice_no?: string;
    department_id?: number;
    machine_id?: number;
    person_id?: number;
    purpose?: string;
    remarks?: string;
    reverses_txn_id?: number;
    created_by: number;
  },
  items: Array<{
    item_id: number;
    quantity: number;
    rate?: number;
    line_remarks?: string;
  }>
) {
  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    // Generate transaction number
    const txn_no = await generateTxnNo(transactionData.txn_type, year, tx);

    // Create the transaction header
    const transaction = await tx.transactions.create({
      data: {
        txn_no,
        txn_type: transactionData.txn_type,
        supplier_id: transactionData.supplier_id,
        invoice_no: transactionData.invoice_no,
        department_id: transactionData.department_id,
        machine_id: transactionData.machine_id,
        person_id: transactionData.person_id,
        purpose: transactionData.purpose,
        remarks: transactionData.remarks,
        reverses_txn_id: transactionData.reverses_txn_id,
        created_by: transactionData.created_by,
      },
    });

    // Create transaction items and update stock
    for (const item of items) {
      // Create the transaction item
      await tx.transaction_items.create({
        data: {
          transaction_id: transaction.id,
          item_id: item.item_id,
          quantity: item.quantity,
          rate: item.rate,
          line_remarks: item.line_remarks,
        },
      });

      // Update the item's current_stock
      const newStock = await recalculateStock(item.item_id, tx);
      await tx.items.update({
        where: { id: item.item_id },
        data: {
          current_stock: newStock,
          last_rate: item.rate || undefined,
        },
      });
    }

    // If this is a reversal, mark the original transaction as reversed
    if (transactionData.reverses_txn_id) {
      await tx.transactions.update({
        where: { id: transactionData.reverses_txn_id },
        data: { is_reversed: true },
      });
    }

    return transaction;
  });
}
