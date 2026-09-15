// Transaction Service Layer
// Handles all business logic for transaction operations

import prisma from '../lib/prisma';
import { generateTxnNo, recalculateStock } from '../utils/stock';
import { CreateStockInInput, CreateStockOutInput, CreateReturnInput } from '../validations/transactionValidation';

// ============================================================
// CREATE STOCK IN TRANSACTION
// ============================================================
export async function createStockIn(data: CreateStockInInput, userId: number) {
  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    // Generate transaction number
    const txn_no = await generateTxnNo('IN', year);

    // Create the transaction header
    const transaction = await tx.transactions.create({
      data: {
        txn_no,
        txn_type: 'IN',
        txn_date: data.txn_date ? new Date(data.txn_date) : new Date(),
        supplier_id: data.supplier_id,
        invoice_no: data.invoice_no,
        remarks: data.remarks,
        created_by: userId,
      },
    });

    // Create transaction items and update stock
    for (const item of data.items) {
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

      // Recalculate stock using the helper function
      const newStock = await recalculateStock(item.item_id);

      // Update the item's current_stock and last_rate
      await tx.items.update({
        where: { id: item.item_id },
        data: {
          current_stock: newStock,
          last_rate: item.rate || undefined,
        },
      });
    }

    // Return the created transaction with items
    return tx.transactions.findUnique({
      where: { id: transaction.id },
      include: {
        transaction_items: {
          include: {
            item: {
              select: {
                id: true,
                item_code: true,
                item_name: true,
                unit: true,
                current_stock: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });
  });
}

// ============================================================
// GET TRANSACTION BY ID
// ============================================================
export async function getTransactionById(id: number) {
  return prisma.transactions.findUnique({
    where: { id },
    include: {
      transaction_items: {
        include: {
          item: {
            select: {
              id: true,
              item_code: true,
              item_name: true,
              unit: true,
              current_stock: true,
            },
          },
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
      creator: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
  });
}

// ============================================================
// LIST TRANSACTIONS (with pagination and filters)
// ============================================================
export async function listTransactions(params: {
  page: number;
  limit: number;
  txn_type?: string;
  from_date?: string;
  to_date?: string;
}) {
  const { page, limit, txn_type, from_date, to_date } = params;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (txn_type) {
    const types = txn_type.split(',').map(t => t.trim()).filter(Boolean);
    where.txn_type = types.length === 1 ? types[0] : { in: types };
  }

  if (from_date || to_date) {
    where.txn_date = {};
    if (from_date) {
      (where.txn_date as Record<string, unknown>).gte = new Date(from_date);
    }
    if (to_date) {
      (where.txn_date as Record<string, unknown>).lte = new Date(to_date);
    }
  }

  const [total, transactions] = await Promise.all([
    prisma.transactions.count({ where }),
    prisma.transactions.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        creator: { select: { id: true, full_name: true } },
        _count: { select: { transaction_items: true } },
      },
      orderBy: { txn_date: 'desc' },
      skip: offset,
      take: limit,
    }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================
// LIST SUPPLIERS (for dropdown)
// ============================================================
export async function listSuppliers() {
  return prisma.suppliers.findMany({
    orderBy: { name: 'asc' },
  });
}

// ============================================================
// CREATE SUPPLIER
// ============================================================
export async function createSupplier(data: {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  return prisma.suppliers.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim(),
      address: data.address?.trim(),
      notes: data.notes?.trim(),
    },
  });
}

// ============================================================
// CREATE STOCK OUT TRANSACTION
// Returns warnings if any item goes below zero
// ============================================================
export async function createStockOut(data: CreateStockOutInput, userId: number) {
  const year = new Date().getFullYear();
  const warnings: Array<{ item_id: number; item_code: string; message: string }> = [];

  const result = await prisma.$transaction(async (tx) => {
    // Generate transaction number
    const txn_no = await generateTxnNo('OUT', year);

    // Create the transaction header
    const transaction = await tx.transactions.create({
      data: {
        txn_no,
        txn_type: 'OUT',
        txn_date: data.txn_date ? new Date(data.txn_date) : new Date(),
        department_id: data.department_id,
        machine_id: data.machine_id,
        person_id: data.person_id,
        purpose: data.purpose,
        remarks: data.remarks,
        created_by: userId,
      },
    });

    // Create transaction items and update stock
    for (const item of data.items) {
      // Get current stock before deduction
      const currentItem = await tx.items.findUnique({
        where: { id: item.item_id },
        select: { current_stock: true, item_code: true },
      });

      // Create the transaction item
      await tx.transaction_items.create({
        data: {
          transaction_id: transaction.id,
          item_id: item.item_id,
          quantity: item.quantity,
          line_remarks: item.line_remarks,
        },
      });

      // Recalculate stock using the helper function
      const newStock = await recalculateStock(item.item_id);

      // Update the item's current_stock
      await tx.items.update({
        where: { id: item.item_id },
        data: { current_stock: newStock },
      });

      // Check if stock went negative and add warning
      if (newStock < 0 && currentItem) {
        warnings.push({
          item_id: item.item_id,
          item_code: currentItem.item_code,
          message: `Stock went negative (${currentItem.current_stock} → ${newStock})`,
        });
      }
    }

    // Return the created transaction with items
    const createdTransaction = await tx.transactions.findUnique({
      where: { id: transaction.id },
      include: {
        transaction_items: {
          include: {
            item: {
              select: {
                id: true,
                item_code: true,
                item_name: true,
                unit: true,
                current_stock: true,
              },
            },
          },
        },
        department: {
          select: { id: true, name: true },
        },
        machine: {
          select: { id: true, name: true },
        },
        person: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, full_name: true },
        },
      },
    });

    return { transaction: createdTransaction, warnings };
  });

  return result;
}

// ============================================================
// LIST PERSONS
// ============================================================
export async function listPersons() {
  return prisma.persons.findMany({
    include: { department: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

// ============================================================
// CREATE PERSON
// ============================================================
export async function createPerson(data: {
  name: string;
  department_id?: number;
  phone?: string;
}) {
  return prisma.persons.create({
    data: {
      name: data.name.trim(),
      department_id: data.department_id,
      phone: data.phone?.trim(),
    },
  });
}

// ============================================================
// LIST DEPARTMENTS
// ============================================================
export async function listDepartments() {
  return prisma.departments.findMany({
    orderBy: { name: 'asc' },
  });
}

// ============================================================
// CREATE DEPARTMENT
// ============================================================
export async function createDepartment(data: { name: string }) {
  return prisma.departments.create({
    data: { name: data.name.trim() },
  });
}

// ============================================================
// LIST MACHINES
// ============================================================
export async function listMachines(departmentId?: number) {
  const where = departmentId ? { department_id: departmentId } : {};
  return prisma.machines.findMany({
    where,
    include: { department: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

// ============================================================
// CREATE MACHINE
// ============================================================
export async function createMachine(data: {
  name: string;
  code?: string;
  department_id?: number;
}) {
  return prisma.machines.create({
    data: {
      name: data.name.trim(),
      code: data.code?.trim(),
      department_id: data.department_id,
    },
  });
}

// ============================================================
// CREATE RETURN TRANSACTION
// RETURN increases stock (item was issued but returned)
// ============================================================
export async function createReturn(data: CreateReturnInput, userId: number) {
  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    const txn_no = await generateTxnNo('RETURN', year);

    const transaction = await tx.transactions.create({
      data: {
        txn_no,
        txn_type: 'RETURN',
        txn_date: data.txn_date ? new Date(data.txn_date) : new Date(),
        supplier_id: data.supplier_id,
        remarks: data.remarks,
        created_by: userId,
      },
    });

    for (const item of data.items) {
      await tx.transaction_items.create({
        data: {
          transaction_id: transaction.id,
          item_id: item.item_id,
          quantity: item.quantity,
          line_remarks: item.line_remarks,
        },
      });

      const newStock = await recalculateStock(item.item_id);
      await tx.items.update({
        where: { id: item.item_id },
        data: { current_stock: newStock },
      });
    }

    return tx.transactions.findUnique({
      where: { id: transaction.id },
      include: {
        transaction_items: {
          include: {
            item: {
              select: {
                id: true,
                item_code: true,
                item_name: true,
                unit: true,
                current_stock: true,
              },
            },
          },
        },
        supplier: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, full_name: true },
        },
      },
    });
  });
}

// ============================================================
// REVERSE TRANSACTION
// ============================================================
export async function reverseTransaction(
  txnId: number,
  reason: string,
  userId: number
) {
  // Fetch the original transaction
  const original = await prisma.transactions.findUnique({
    where: { id: txnId },
    include: { transaction_items: true },
  });

  if (!original) {
    throw new Error('Transaction not found');
  }

  if (original.is_reversed) {
    throw new Error('Transaction is already reversed');
  }

  // Determine the reversal type and sign
  // IN → reverse as OUT (negative qty), OUT → reverse as IN (positive qty)
  const reversalType = original.txn_type === 'IN' ? 'OUT' : 'IN';

  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    // Generate transaction number for reversal
    const txn_no = await generateTxnNo('REVERSAL', year);

    // Create the reversal transaction
    const reversalTxn = await tx.transactions.create({
      data: {
        txn_no,
        txn_type: 'REVERSAL',
        txn_date: new Date(),
        supplier_id: original.supplier_id,
        person_id: original.person_id,
        department_id: original.department_id,
        machine_id: original.machine_id,
        purpose: original.purpose,
        remarks: reason,
        reverses_txn_id: original.id,
        created_by: userId,
      },
    });

    // Create reversal items (opposite quantities)
    const affectedItemIds = new Set<number>();
    for (const item of original.transaction_items) {
      const reversalQty = original.txn_type === 'IN'
        ? -item.quantity  // IN reversal = negative (removes stock)
        : item.quantity;  // OUT reversal = positive (adds stock back)

      await tx.transaction_items.create({
        data: {
          transaction_id: reversalTxn.id,
          item_id: item.item_id,
          quantity: reversalQty,
          rate: item.rate,
          line_remarks: `Reversal of ${original.txn_no}: ${reason}`,
        },
      });

      affectedItemIds.add(item.item_id);
    }

    // Mark original as reversed FIRST
    await tx.transactions.update({
      where: { id: original.id },
      data: { is_reversed: true },
    });

    // THEN recalculate stock for affected items (now original is skipped)
    for (const itemId of affectedItemIds) {
      const newStock = await recalculateStock(itemId);
      await tx.items.update({
        where: { id: itemId },
        data: { current_stock: newStock },
      });
    }

    return reversalTxn;
  });
}
