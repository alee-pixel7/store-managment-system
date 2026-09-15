// Analytics Service Layer
// Consumption trends, machine comparisons, dead stock, stock value trends

import prisma from '../lib/prisma';

// ============================================================
// 1. CONSUMPTION TREND PER ITEM (line chart data)
// ============================================================
export async function getConsumptionTrend(itemId: number, months: number = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setHours(0, 0, 0, 0);

  // Get all OUT transactions for this item since startDate
  const txnItems = await prisma.transaction_items.findMany({
    where: {
      item_id: itemId,
      transaction: {
        txn_date: { gte: startDate },
        txn_type: { in: ['OUT', 'RETURN'] },
        is_reversed: false,
      },
    },
    include: {
      transaction: { select: { txn_date: true, txn_type: true } },
    },
    orderBy: { transaction: { txn_date: 'asc' } },
  });

  // Group by month
  const monthlyData: Record<string, { month: string; quantity: number; value: number }> = {};

  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    monthlyData[key] = { month: label, quantity: 0, value: 0 };
  }

  for (const ti of txnItems) {
    const d = new Date(ti.transaction.txn_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[key]) {
      const qty = ti.transaction.txn_type === 'RETURN' ? -ti.quantity : ti.quantity;
      monthlyData[key].quantity += qty;
      monthlyData[key].value += qty * (ti.rate || 0);
    }
  }

  return Object.values(monthlyData).reverse();
}

// ============================================================
// 2. MACHINE-WISE CONSUMPTION (bar chart data)
// ============================================================
export async function getMachineConsumption(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const txnItems = await prisma.transaction_items.findMany({
    where: {
      transaction: {
        txn_date: { gte: startDate, lte: endDate },
        txn_type: { in: ['OUT'] },
        is_reversed: false,
        machine_id: { not: null },
      },
    },
    include: {
      transaction: {
        select: { machine_id: true },
      },
      item: { select: { item_code: true, item_name: true } },
    },
  });

  // Group by machine
  const machineMap: Record<number, { machineId: number; machineName: string; totalQty: number; totalValue: number; items: number; itemSet: Set<number> }> = {};

  for (const ti of txnItems) {
    const mid = ti.transaction.machine_id!;
    if (!machineMap[mid]) {
      machineMap[mid] = { machineId: mid, machineName: '', totalQty: 0, totalValue: 0, items: 0, itemSet: new Set() };
    }
    machineMap[mid].totalQty += ti.quantity;
    machineMap[mid].totalValue += ti.quantity * (ti.rate || 0);
    machineMap[mid].itemSet.add(ti.item_id);
  }

  // Fetch machine names
  const machineIds = Object.keys(machineMap).map(Number);
  const machines = await prisma.machines.findMany({
    where: { id: { in: machineIds } },
    select: { id: true, name: true, code: true },
  });

  const machineNameMap = new Map(machines.map(m => [m.id, m.code || m.name]));

  return Object.values(machineMap).map(m => ({
    machineId: m.machineId,
    machineName: machineNameMap.get(m.machineId) || `Machine ${m.machineId}`,
    totalQty: m.totalQty,
    totalValue: m.totalValue,
    items: m.itemSet.size,
  }));
}

// ============================================================
// 3. UNUSUAL CONSUMPTION FLAG
// ============================================================
export async function getUnusualConsumption() {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Get all machines that had OUT transactions
  const allMachines = await prisma.machines.findMany({
    where: {
      transactions: {
        some: {
          txn_type: 'OUT',
          is_reversed: false,
        },
      },
    },
    select: { id: true, name: true, code: true },
  });

  const flags: Array<{
    machineId: number;
    machineName: string;
    currentMonthQty: number;
    sixMonthAvgQty: number;
    percentAbove: number;
    topItems: Array<{ itemCode: string; itemName: string; qty: number }>;
  }> = [];

  for (const machine of allMachines) {
    // Current month consumption
    const currentMonthItems = await prisma.transaction_items.findMany({
      where: {
        transaction: {
          machine_id: machine.id,
          txn_date: { gte: currentMonthStart, lte: currentMonthEnd },
          txn_type: 'OUT',
          is_reversed: false,
        },
      },
      include: { item: { select: { item_code: true, item_name: true } } },
    });

    const currentMonthQty = currentMonthItems.reduce((sum, ti) => sum + ti.quantity, 0);

    // 6-month average (total / 6)
    const sixMonthItems = await prisma.transaction_items.findMany({
      where: {
        transaction: {
          machine_id: machine.id,
          txn_date: { gte: sixMonthsAgo, lt: currentMonthStart },
          txn_type: 'OUT',
          is_reversed: false,
        },
      },
    });

    const sixMonthTotal = sixMonthItems.reduce((sum, ti) => sum + ti.quantity, 0);
    const sixMonthAvgQty = sixMonthTotal / 6;

    // Flag if current month > 50% above average
    if (sixMonthAvgQty > 0 && currentMonthQty > sixMonthAvgQty * 1.5) {
      const percentAbove = ((currentMonthQty - sixMonthAvgQty) / sixMonthAvgQty) * 100;

      // Top items this month
      const itemQtyMap: Record<number, { itemCode: string; itemName: string; qty: number }> = {};
      for (const ti of currentMonthItems) {
        if (!itemQtyMap[ti.item_id]) {
          itemQtyMap[ti.item_id] = { itemCode: ti.item.item_code, itemName: ti.item.item_name, qty: 0 };
        }
        itemQtyMap[ti.item_id].qty += ti.quantity;
      }
      const topItems = Object.values(itemQtyMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

      flags.push({
        machineId: machine.id,
        machineName: machine.code || machine.name,
        currentMonthQty,
        sixMonthAvgQty: Math.round(sixMonthAvgQty * 100) / 100,
        percentAbove: Math.round(percentAbove),
        topItems,
      });
    }
  }

  return flags.sort((a, b) => b.percentAbove - a.percentAbove);
}

// ============================================================
// 4. AVERAGE DAYS BETWEEN REORDERS PER ITEM
// ============================================================
export async function getReorderInterval() {
  // Get all items that have at least 2 IN transactions
  const items = await prisma.items.findMany({
    where: { is_active: true },
    select: {
      id: true,
      item_code: true,
      item_name: true,
      brand: true,
      unit: true,
      current_stock: true,
      last_rate: true,
    },
  });

  const results: Array<{
    itemId: number;
    itemCode: string;
    itemName: string;
    brand: string | null;
    unit: string;
    currentStock: number;
    avgDaysBetweenReorders: number | null;
    lastReceivedDate: string | null;
    totalReorders: number;
  }> = [];

  for (const item of items) {
    const inTxns = await prisma.transaction_items.findMany({
      where: {
        item_id: item.id,
        transaction: {
          txn_type: 'IN',
          is_reversed: false,
        },
      },
      include: {
        transaction: { select: { txn_date: true } },
      },
      orderBy: { transaction: { txn_date: 'asc' } },
    });

    const dates = inTxns.map(ti => new Date(ti.transaction.txn_date).getTime());
    const uniqueDates = [...new Set(dates)].sort((a, b) => a - b);

    let avgDays: number | null = null;
    if (uniqueDates.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < uniqueDates.length; i++) {
        totalGap += uniqueDates[i] - uniqueDates[i - 1];
      }
      avgDays = Math.round((totalGap / (uniqueDates.length - 1)) / (1000 * 60 * 60 * 24));
    }

    results.push({
      itemId: item.id,
      itemCode: item.item_code,
      itemName: item.item_name,
      brand: item.brand,
      unit: item.unit,
      currentStock: item.current_stock,
      avgDaysBetweenReorders: avgDays,
      lastReceivedDate: uniqueDates.length > 0 ? new Date(uniqueDates[uniqueDates.length - 1]).toISOString().split('T')[0] : null,
      totalReorders: uniqueDates.length,
    });
  }

  return results.filter(r => r.totalReorders >= 2).sort((a, b) => (a.avgDaysBetweenReorders || 999) - (b.avgDaysBetweenReorders || 999));
}

// ============================================================
// 5. DEAD STOCK REPORT
// ============================================================
export async function getDeadStock() {
  const now = new Date();
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
  const d180 = new Date(now); d180.setDate(d180.getDate() - 180);
  const d365 = new Date(now); d365.setDate(d365.getDate() - 365);

  const items = await prisma.items.findMany({
    where: { is_active: true },
    select: {
      id: true,
      item_code: true,
      item_name: true,
      brand: true,
      unit: true,
      current_stock: true,
      last_rate: true,
      rack_location: true,
    },
  });

  const results: Array<{
    itemId: number;
    itemCode: string;
    itemName: string;
    brand: string | null;
    unit: string;
    currentStock: number;
    lastRate: number | null;
    tiedUpValue: number;
    lastMovementDate: string | null;
    daysSinceMovement: number | null;
    deadCategory: '90days' | '180days' | '365days' | 'active';
  }> = [];

  for (const item of items) {
    // Find last OUT transaction
    const lastOut = await prisma.transaction_items.findFirst({
      where: {
        item_id: item.id,
        transaction: {
          txn_type: { in: ['OUT', 'RETURN'] },
          is_reversed: false,
        },
      },
      include: { transaction: { select: { txn_date: true } } },
      orderBy: { transaction: { txn_date: 'desc' } },
    });

    const lastMovement = lastOut ? new Date(lastOut.transaction.txn_date) : null;
    const daysSince = lastMovement ? Math.floor((now.getTime() - lastMovement.getTime()) / (1000 * 60 * 60 * 24)) : null;

    let deadCategory: '90days' | '180days' | '365days' | 'active' = 'active';
    if (daysSince !== null) {
      if (daysSince >= 365) deadCategory = '365days';
      else if (daysSince >= 180) deadCategory = '180days';
      else if (daysSince >= 90) deadCategory = '90days';
    } else if (item.current_stock > 0) {
      // Never had an OUT transaction but has stock
      deadCategory = '365days';
    }

    if (item.current_stock > 0) {
      results.push({
        itemId: item.id,
        itemCode: item.item_code,
        itemName: item.item_name,
        brand: item.brand,
        unit: item.unit,
        currentStock: item.current_stock,
        lastRate: item.last_rate,
        tiedUpValue: item.current_stock * (item.last_rate || 0),
        lastMovementDate: lastMovement ? lastMovement.toISOString().split('T')[0] : null,
        daysSinceMovement: daysSince,
        deadCategory,
      });
    }
  }

  return results.sort((a, b) => (b.daysSinceMovement ?? 9999) - (a.daysSinceMovement ?? 9999));
}

// ============================================================
// 6. STOCK VALUE TREND (last 12 months)
// ============================================================
export async function getStockValueTrend() {
  const months = 12;
  const results: Array<{ month: string; stockValue: number; inValue: number; outValue: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });

    // Stock value at end of month = sum of all IN - sum of all OUT up to this month
    const inResult = await prisma.transaction_items.aggregate({
      where: {
        transaction: {
          txn_date: { lte: monthEnd },
          txn_type: 'IN',
          is_reversed: false,
        },
      },
      _sum: { quantity: true },
    });

    const outResult = await prisma.transaction_items.aggregate({
      where: {
        transaction: {
          txn_date: { lte: monthEnd },
          txn_type: { in: ['OUT'] },
          is_reversed: false,
        },
      },
      _sum: { quantity: true },
    });

    // Value = sum of (qty * rate) for IN - sum of (qty * rate) for OUT
    const inValueResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(ti.quantity * COALESCE(ti.rate, 0)), 0) as total
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.txn_date <= ${monthEnd}
        AND t.txn_type = 'IN'
        AND t.is_reversed = 0
    ` as Array<{ total: number }>;

    const outValueResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(ti.quantity * COALESCE(ti.rate, 0)), 0) as total
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.txn_date <= ${monthEnd}
        AND t.txn_type = 'OUT'
        AND t.is_reversed = 0
    ` as Array<{ total: number }>;

    const inValue = Number(inValueResult[0]?.total || 0);
    const outValue = Number(outValueResult[0]?.total || 0);

    results.push({
      month: label,
      stockValue: Math.round(inValue - outValue),
      inValue: Math.round(inValue),
      outValue: Math.round(outValue),
    });
  }

  return results;
}
