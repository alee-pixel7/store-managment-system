// Dashboard Service Layer
// Provides summary data for the dashboard

import prisma from '../lib/prisma';

export interface DashboardSummary {
  totalActiveItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  todayInCount: number;
  todayInTotalQty: number;
  todayOutCount: number;
  todayOutTotalQty: number;
  lastTransactions: Array<{
    id: number;
    txn_no: string;
    txn_type: string;
    txn_date: string;
    party: string;
    item_count: number;
    total_qty: number;
    created_by: string;
  }>;
  lowStockItems: Array<{
    id: number;
    item_code: string;
    item_name: string;
    brand: string | null;
    unit: string;
    current_stock: number;
    min_stock: number;
    rack_location: string | null;
    category: string | null;
  }>;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Run all queries in parallel
  const [
    totalActiveItems,
    lowStockItems,
    outOfStockCount,
    stockValueResult,
    todayInResult,
    todayOutResult,
    lastTransactions,
  ] = await Promise.all([
    // Total active items
    prisma.items.count({
      where: { is_active: true },
    }),

    // Low stock items (current_stock <= min_stock and > 0)
    prisma.items.findMany({
      where: {
        is_active: true,
        min_stock: { gt: 0 },
        current_stock: { gt: 0 },
      },
      select: {
        id: true,
        item_code: true,
        item_name: true,
        brand: true,
        unit: true,
        current_stock: true,
        min_stock: true,
        rack_location: true,
        category: { select: { name: true } },
      },
      orderBy: { current_stock: 'asc' },
    }),

    // Out of stock count
    prisma.items.count({
      where: {
        is_active: true,
        current_stock: { lte: 0 },
      },
    }),

    // Total stock value
    prisma.items.aggregate({
      where: {
        is_active: true,
        current_stock: { gt: 0 },
        last_rate: { not: null },
      },
      _sum: {
        current_stock: true,
      },
    }),

    // Today's IN transactions
    prisma.transaction_items.aggregate({
      where: {
        transaction: {
          txn_type: 'IN',
          txn_date: { gte: today, lt: tomorrow },
          is_reversed: false,
        },
      },
      _count: { id: true },
      _sum: { quantity: true },
    }),

    // Today's OUT transactions
    prisma.transaction_items.aggregate({
      where: {
        transaction: {
          txn_type: 'OUT',
          txn_date: { gte: today, lt: tomorrow },
          is_reversed: false,
        },
      },
      _count: { id: true },
      _sum: { quantity: true },
    }),

    // Last 10 transactions
    prisma.transactions.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        transaction_items: {
          select: { quantity: true },
        },
        supplier: { select: { name: true } },
        person: { select: { name: true } },
        creator: { select: { full_name: true } },
      },
    }),
  ]);

  // Calculate total stock value
  let totalStockValue = 0;
  if (stockValueResult._sum.current_stock) {
    // We need to multiply by last_rate for each item
    const itemsWithValue = await prisma.items.findMany({
      where: {
        is_active: true,
        current_stock: { gt: 0 },
        last_rate: { not: null },
      },
      select: {
        current_stock: true,
        last_rate: true,
      },
    });
    totalStockValue = itemsWithValue.reduce(
      (sum, item) => sum + item.current_stock * (item.last_rate || 0),
      0
    );
  }

  // Format last transactions
  const formattedLastTransactions = lastTransactions.map((txn) => ({
    id: txn.id,
    txn_no: txn.txn_no,
    txn_type: txn.txn_type,
    txn_date: txn.txn_date.toISOString(),
    party: txn.supplier?.name || txn.person?.name || '-',
    item_count: txn.transaction_items.length,
    total_qty: txn.transaction_items.reduce((sum, ti) => sum + ti.quantity, 0),
    created_by: txn.creator.full_name,
  }));

  // Format low stock items
  const formattedLowStockItems = lowStockItems
    .filter((item) => item.current_stock <= item.min_stock)
    .map((item) => ({
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      brand: item.brand,
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      rack_location: item.rack_location,
      category: item.category?.name || null,
    }));

  return {
    totalActiveItems,
    lowStockCount: formattedLowStockItems.length,
    outOfStockCount,
    totalStockValue,
    todayInCount: todayInResult._count.id || 0,
    todayInTotalQty: todayInResult._sum.quantity || 0,
    todayOutCount: todayOutResult._count.id || 0,
    todayOutTotalQty: todayOutResult._sum.quantity || 0,
    lastTransactions: formattedLastTransactions,
    lowStockItems: formattedLowStockItems,
  };
}
