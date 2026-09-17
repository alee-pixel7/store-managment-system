// Item Service Layer
// Handles all business logic for item CRUD and smart search

import prisma from '../lib/prisma';
import { CreateItemInput, UpdateItemInput } from '../validations/itemValidation';

// ============================================================
// LIST ITEMS - with pagination, search, filters
// ============================================================
export async function listItems(params: {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  category_id?: number;
  low_stock?: boolean;
  out_of_stock?: boolean;
  is_active?: boolean;
}) {
  const { page, limit, offset, search, category_id, low_stock, out_of_stock, is_active } = params;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Active filter (default: true)
  where.is_active = is_active !== undefined ? is_active : true;

  // Category filter
  if (category_id) {
    where.category_id = category_id;
  }

  // Low stock filter: current_stock <= min_stock and min_stock > 0
  const shouldFilterLowStock = low_stock === true;

  // Out of stock filter: current_stock <= 0
  const shouldFilterOutOfStock = out_of_stock === true;

  // Out of stock can be done in SQL
  if (shouldFilterOutOfStock) {
    where.current_stock = { lte: 0 };
  }

  // Search filter
  if (search && search.trim()) {
    const searchTerm = search.trim().toUpperCase();
    where.OR = [
      { item_code: { contains: searchTerm } },
      { item_name: { contains: searchTerm } },
      { brand: { contains: searchTerm } },
      { item_aliases: { some: { alias_name: { contains: searchTerm } } } },
    ];
  }

  // Get total count and items
  let [total, items] = await Promise.all([
    prisma.items.count({ where }),
    prisma.items.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        item_aliases: { select: { id: true, alias_name: true } },
      },
      orderBy: { item_code: 'asc' },
      skip: offset,
      take: limit,
    }),
  ]);

  // Apply low stock filter in-memory (current_stock <= min_stock and min_stock > 0)
  if (shouldFilterLowStock) {
    items = items.filter(
      (item) => item.min_stock > 0 && item.current_stock <= item.min_stock
    );
    total = items.length;
  }

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================
// GET SINGLE ITEM - with aliases and last 20 transactions
// ============================================================
export async function getItemById(id: number) {
  const item = await prisma.items.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      item_aliases: { select: { id: true, alias_name: true } },
      transaction_items: {
        take: 20,
        orderBy: { transaction: { txn_date: 'desc' } },
        include: {
          transaction: {
            select: {
              id: true,
              txn_no: true,
              txn_type: true,
              txn_date: true,
              is_reversed: true,
              creator: { select: { full_name: true } },
            },
          },
        },
      },
    },
  });

  if (!item) {
    return null;
  }

  // Flatten transaction_items for easier consumption
  const recentTransactions = item.transaction_items.map((ti) => ({
    id: ti.transaction.id,
    txn_no: ti.transaction.txn_no,
    txn_type: ti.transaction.txn_type,
    txn_date: ti.transaction.txn_date,
    quantity: ti.quantity,
    rate: ti.rate,
    line_remarks: ti.line_remarks,
    is_reversed: ti.transaction.is_reversed,
    created_by: ti.transaction.creator.full_name,
  }));

  return {
    ...item,
    recentTransactions,
    transaction_items: undefined,
  };
}

// ============================================================
// CREATE ITEM - with aliases
// ============================================================
export async function createItem(data: CreateItemInput) {
  return prisma.$transaction(async (tx) => {
    // Check category exists if provided
    if (data.category_id !== undefined && data.category_id !== null) {
      const catExists = await tx.categories.findUnique({ where: { id: data.category_id } });
      if (!catExists) {
        throw new Error('Category does not exist');
      }
    }

    // Create the item
    const item = await tx.items.create({
      data: {
        item_code: data.item_code,
        item_name: data.item_name,
        category_id: data.category_id,
        brand: data.brand,
        unit: data.unit,
        min_stock: data.min_stock || 0,
        rack_location: data.rack_location,
        notes: data.notes,
      },
    });

    // Create aliases if provided
    if (data.aliases && data.aliases.length > 0) {
      await tx.item_aliases.createMany({
        data: data.aliases.map((alias) => ({
          item_id: item.id,
          alias_name: alias.toUpperCase(),
        })),
      });
    }

    // Return item with aliases
    return tx.items.findUnique({
      where: { id: item.id },
      include: {
        category: { select: { id: true, name: true } },
        item_aliases: { select: { id: true, alias_name: true } },
      },
    });
  });
}

// ============================================================
// UPDATE ITEM - aliases replaced as a set
// ============================================================
export async function updateItem(id: number, data: UpdateItemInput) {
  // Check if item exists
  const existing = await prisma.items.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    // Check category exists if being set
    if (data.category_id !== undefined && data.category_id !== null) {
      const catExists = await tx.categories.findUnique({ where: { id: data.category_id } });
      if (!catExists) {
        throw new Error('Category does not exist');
      }
    }

    // Update item fields
    const updateData: Record<string, unknown> = {};
    if (data.item_code !== undefined) updateData.item_code = data.item_code;
    if (data.item_name !== undefined) updateData.item_name = data.item_name;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.min_stock !== undefined) updateData.min_stock = data.min_stock;
    if (data.rack_location !== undefined) updateData.rack_location = data.rack_location;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const item = await tx.items.update({
      where: { id },
      data: updateData,
    });

    // Replace aliases if provided
    if (data.aliases !== undefined) {
      // Delete existing aliases
      await tx.item_aliases.deleteMany({ where: { item_id: id } });

      // Create new aliases
      if (data.aliases.length > 0) {
        await tx.item_aliases.createMany({
          data: data.aliases.map((alias) => ({
            item_id: id,
            alias_name: alias.toUpperCase(),
          })),
        });
      }
    }

    // Return updated item
    return tx.items.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        item_aliases: { select: { id: true, alias_name: true } },
      },
    });
  });
}

// ============================================================
// SOFT DELETE ITEM - set is_active = false
// ============================================================
export async function softDeleteItem(id: number) {
  const existing = await prisma.items.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.items.update({
    where: { id },
    data: { is_active: false },
  });
}

// ============================================================
// SMART SEARCH - the most important feature
// ============================================================
export async function smartSearch(query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // Normalize search: remove spaces, dashes, convert to uppercase
  const normalizedQuery = query
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, '');

  if (normalizedQuery.length === 0) {
    return [];
  }

  // Get all active items with aliases (max 5000 items is fine for SQLite)
  const items = await prisma.items.findMany({
    where: { is_active: true },
    include: {
      item_aliases: { select: { alias_name: true } },
      category: { select: { id: true, name: true } },
    },
    take: 5000,
  });

  // Score and rank items
  const scoredItems = items.map((item) => {
    let score = 0;

    // Normalize item fields for comparison
    const normalizedCode = item.item_code.replace(/[\s\-_]/g, '').toUpperCase();
    const normalizedName = item.item_name.replace(/[\s\-_]/g, '').toUpperCase();
    const normalizedBrand = (item.brand || '').replace(/[\s\-_]/g, '').toUpperCase();

    // Exact item_code match (highest priority)
    if (normalizedCode === normalizedQuery) {
      score = 1000;
    }
    // Item_code starts with query
    else if (normalizedCode.startsWith(normalizedQuery)) {
      score = 900;
    }
    // Item_code contains query
    else if (normalizedCode.includes(normalizedQuery)) {
      score = 800;
    }

    // Check aliases
    if (score === 0) {
      for (const alias of item.item_aliases) {
        const normalizedAlias = alias.alias_name.replace(/[\s\-_]/g, '').toUpperCase();
        if (normalizedAlias === normalizedQuery) {
          score = 700;
          break;
        } else if (normalizedAlias.startsWith(normalizedQuery)) {
          score = 600;
          break;
        } else if (normalizedAlias.includes(normalizedQuery)) {
          score = 500;
          break;
        }
      }
    }

    // Check item_name
    if (score === 0) {
      if (normalizedName.includes(normalizedQuery)) {
        score = 400;
      }
    }

    // Check brand
    if (score === 0) {
      if (normalizedBrand.includes(normalizedQuery)) {
        score = 300;
      }
    }

    return { item, score };
  });

  // Filter scored items (score > 0) and sort by score descending
  const results = scoredItems
    .filter((si) => si.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ item }) => ({
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      rack_location: item.rack_location,
      category_id: item.category_id,
      category: item.category,
      brand: item.brand,
    }));

  return results;
}

// ============================================================
// GET ITEM LEDGER - all transactions for an item with running balance
// ============================================================
export async function getItemLedger(
  itemId: number,
  params: {
    from?: string;
    to?: string;
    type?: string;
  }
) {
  // Verify item exists
  const item = await prisma.items.findUnique({ where: { id: itemId } });
  if (!item) {
    return null;
  }

  // Build date filter
  const dateFilter: Record<string, Date> = {};
  if (params.from) {
    dateFilter.gte = new Date(params.from);
  }
  if (params.to) {
    // Add one day to include the entire 'to' date
    const toDate = new Date(params.to);
    toDate.setDate(toDate.getDate() + 1);
    dateFilter.lte = toDate;
  }

  // Build transaction filter
  const txnWhere: Record<string, unknown> = {
    item_id: itemId,
  };

  if (Object.keys(dateFilter).length > 0) {
    txnWhere.transaction = { txn_date: dateFilter };
  }

  if (params.type) {
    txnWhere.transaction = {
      ...(txnWhere.transaction as Record<string, unknown>),
      txn_type: params.type,
    };
  }

  // Get all transaction lines for this item
  const transactionLines = await prisma.transaction_items.findMany({
    where: txnWhere,
    include: {
      transaction: {
        include: {
          supplier: { select: { id: true, name: true } },
          person: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          machine: { select: { id: true, name: true, code: true } },
          creator: { select: { id: true, full_name: true } },
        },
      },
    },
    orderBy: { transaction: { txn_date: 'asc' } },
  });

  // Calculate running balance (skip reversed transactions for balance)
  let runningBalance = 0;
  const ledger = transactionLines.map((line) => {
    const txn = line.transaction;
    let inQty = 0;
    let outQty = 0;

    // Determine quantity direction based on transaction type
    // Only add to running balance if NOT reversed
    if (!txn.is_reversed) {
      switch (txn.txn_type) {
        case 'IN':
        case 'RETURN':
          inQty = line.quantity;
          runningBalance += line.quantity;
          break;
        case 'OUT':
          outQty = line.quantity;
          runningBalance -= line.quantity;
          break;
        case 'ADJUST':
        case 'REVERSAL':
          // ADJUST and REVERSAL quantities are already signed
          if (line.quantity >= 0) {
            inQty = line.quantity;
          } else {
            outQty = Math.abs(line.quantity);
          }
          runningBalance += line.quantity;
          break;
      }
    } else {
      // Reversed transactions: still show quantities but don't affect balance
      if (txn.txn_type === 'IN' || txn.txn_type === 'RETURN') {
        inQty = line.quantity;
      } else if (txn.txn_type === 'OUT') {
        outQty = line.quantity;
      } else if (line.quantity >= 0) {
        inQty = line.quantity;
      } else {
        outQty = Math.abs(line.quantity);
      }
    }

    // Build party info
    let party = '';
    if (txn.supplier) {
      party = txn.supplier.name;
    } else if (txn.person || txn.department || txn.machine) {
      const parts: string[] = [];
      if (txn.person) parts.push(txn.person.name);
      if (txn.department) parts.push(txn.department.name);
      if (txn.machine) {
        parts.push(txn.machine.code ? `${txn.machine.code}` : txn.machine.name);
      }
      party = parts.join(' / ');
    }

    return {
      id: line.id,
      date: txn.txn_date,
      txn_no: txn.txn_no,
      txn_type: txn.txn_type,
      in_qty: inQty || null,
      out_qty: outQty || null,
      running_balance: runningBalance,
      rate: line.rate,
      party,
      purpose: txn.purpose,
      remarks: txn.remarks || line.line_remarks,
      is_reversed: txn.is_reversed,
      created_by: txn.creator.full_name,
    };
  });

  // Get category for the item
  const category = item.category_id
    ? await prisma.categories.findUnique({ where: { id: item.category_id }, select: { id: true, name: true } }).catch(() => null)
    : null;

  return {
    item: {
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      brand: item.brand,
      unit: item.unit,
      rack_location: item.rack_location,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      last_rate: item.last_rate,
      category,
    },
    ledger,
  };
}
