// Monthly Report Service Layer
// Generates monthly transaction reports with department/machine consumption, top items, stock alerts

import prisma from '../lib/prisma';

export interface MonthlyReport {
  year: number;
  month: number;
  monthName: string;
  summary: {
    totalReceived: number;
    totalIssued: number;
    totalReturned: number;
    totalReceivedValue: number;
    totalIssuedValue: number;
    totalReturnedValue: number;
    totalTransactions: number;
  };
  departmentConsumption: Array<{
    department: string;
    totalQty: number;
    totalValue: number;
    items: number;
  }>;
  machineConsumption: Array<{
    machine: string;
    department: string | null;
    totalQty: number;
    totalValue: number;
    items: number;
  }>;
  topConsumedItems: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    unit: string;
    totalIssued: number;
    totalReceived: number;
    netConsumption: number;
    estimatedValue: number;
  }>;
  outOfStockItems: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    unit: string;
    minStock: number;
    daysOutOfStock: number;
  }>;
  stockValue: {
    opening: number;
    closing: number;
  };
}

export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  // Calculate month boundaries
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const monthName = startDate.toLocaleString('en-IN', { month: 'long' });

  // Get opening stock (stock at start of month)
  const openingStock = await calculateStockValueAtTime(startDate);

  // Get closing stock (stock at end of month)
  const closingStock = await calculateStockValueAtTime(new Date(endDate.getTime() + 1));

  // Get all non-reversed transactions for the month
  const transactions = await prisma.transactions.findMany({
    where: {
      txn_date: {
        gte: startDate,
        lte: endDate,
      },
      is_reversed: false,
    },
    include: {
      transaction_items: {
        include: {
          item: true,
        },
      },
      department: { select: { name: true } },
      machine: { select: { name: true, code: true } },
    },
  });

  // Calculate summary
  let totalReceived = 0;
  let totalIssued = 0;
  let totalReturned = 0;
  let totalReceivedValue = 0;
  let totalIssuedValue = 0;
  let totalReturnedValue = 0;

  // Department consumption
  const deptMap = new Map<string, { totalQty: number; totalValue: number; items: Set<number> }>();

  // Machine consumption
  const machineMap = new Map<string, { machine: string; department: string | null; totalQty: number; totalValue: number; items: Set<number> }>();

  // Item consumption tracking
  const itemMap = new Map<number, {
    itemCode: string;
    itemName: string;
    brand: string | null;
    unit: string;
    totalIssued: number;
    totalReceived: number;
    lastRate: number;
  }>();

  for (const txn of transactions) {
    const deptName = txn.department?.name || 'Unknown';
    const machineName = txn.machine?.code || txn.machine?.name || null;

    // Initialize department tracking
    if (!deptMap.has(deptName)) {
      deptMap.set(deptName, { totalQty: 0, totalValue: 0, items: new Set() });
    }

    // Initialize machine tracking
    if (machineName) {
      const machineKey = machineName;
      if (!machineMap.has(machineKey)) {
        machineMap.set(machineKey, {
          machine: machineName,
          department: deptName,
          totalQty: 0,
          totalValue: 0,
          items: new Set(),
        });
      }
    }

    for (const item of txn.transaction_items) {
      const qty = item.quantity;
      const rate = item.rate || 0;
      const value = qty * rate;
      const itemId = item.item_id;

      // Initialize item tracking
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          itemCode: item.item.item_code,
          itemName: item.item.item_name,
          brand: item.item.brand,
          unit: item.item.unit,
          totalIssued: 0,
          totalReceived: 0,
          lastRate: rate,
        });
      }

      const itemData = itemMap.get(itemId)!;

      if (txn.txn_type === 'IN') {
        totalReceived += qty;
        totalReceivedValue += value;
        itemData.totalReceived += qty;
      } else if (txn.txn_type === 'OUT') {
        totalIssued += qty;
        totalIssuedValue += value;
        itemData.totalIssued += qty;

        // Track department consumption
        const dept = deptMap.get(deptName)!;
        dept.totalQty += qty;
        dept.totalValue += value;
        dept.items.add(itemId);

        // Track machine consumption
        if (machineName) {
          const mach = machineMap.get(machineName)!;
          mach.totalQty += qty;
          mach.totalValue += value;
          mach.items.add(itemId);
        }
      } else if (txn.txn_type === 'RETURN') {
        totalReturned += qty;
        totalReturnedValue += value;
        itemData.totalReceived += qty; // Returns add back to stock
      }
    }
  }

  // Convert department map to array
  const departmentConsumption = Array.from(deptMap.entries())
    .map(([department, data]) => ({
      department,
      totalQty: data.totalQty,
      totalValue: data.totalValue,
      items: data.items.size,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  // Convert machine map to array
  const machineConsumption = Array.from(machineMap.values())
    .map((data) => ({
      machine: data.machine,
      department: data.department,
      totalQty: data.totalQty,
      totalValue: data.totalValue,
      items: data.items.size,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  // Convert item map to array and get top 20 consumed
  const topConsumedItems = Array.from(itemMap.values())
    .map((data) => ({
      itemCode: data.itemCode,
      itemName: data.itemName,
      brand: data.brand,
      unit: data.unit,
      totalIssued: data.totalIssued,
      totalReceived: data.totalReceived,
      netConsumption: data.totalIssued - data.totalReceived,
      estimatedValue: data.totalIssued * data.lastRate,
    }))
    .sort((a, b) => b.netConsumption - a.netConsumption)
    .slice(0, 20);

  // Find items that were out of stock at any point during the month
  const outOfStockItems = await findOutOfStockItems(startDate, endDate);

  return {
    year,
    month,
    monthName,
    summary: {
      totalReceived,
      totalIssued,
      totalReturned,
      totalReceivedValue,
      totalIssuedValue,
      totalReturnedValue,
      totalTransactions: transactions.length,
    },
    departmentConsumption,
    machineConsumption,
    topConsumedItems,
    outOfStockItems,
    stockValue: {
      opening: openingStock,
      closing: closingStock,
    },
  };
}

async function calculateStockValueAtTime(beforeTime: Date): Promise<number> {
  const items = await prisma.items.findMany({
    where: { is_active: true },
  });

  let totalValue = 0;

  for (const item of items) {
    // Get stock at this time
    const result = await prisma.transaction_items.aggregate({
      where: {
        item_id: item.id,
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

    const stock = result._sum.quantity || 0;
    const rate = item.last_rate || 0;
    totalValue += stock * rate;
  }

  return totalValue;
}

async function findOutOfStockItems(
  startDate: Date,
  endDate: Date
): Promise<MonthlyReport['outOfStockItems']> {
  // Get all active items
  const items = await prisma.items.findMany({
    where: {
      is_active: true,
    },
  });

  const outOfStockItems: MonthlyReport['outOfStockItems'] = [];

  for (const item of items) {
    // Check each day of the month
    let daysOutOfStock = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const stock = await calculateStockAtTime(item.id, new Date(currentDate));
      
      if (stock <= 0) {
        daysOutOfStock++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (daysOutOfStock > 0) {
      outOfStockItems.push({
        itemCode: item.item_code,
        itemName: item.item_name,
        brand: item.brand,
        unit: item.unit,
        minStock: item.min_stock,
        daysOutOfStock,
      });
    }
  }

  return outOfStockItems.sort((a, b) => b.daysOutOfStock - a.daysOutOfStock);
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
