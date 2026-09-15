// Reorder Service Layer
// Calculates suggested min_stock based on consumption history and lead times

import prisma from '../lib/prisma';

const DEFAULT_LEAD_TIME_DAYS = 30;
const LOOKBACK_MONTHS = 6;
const SAFETY_BUFFER_MULTIPLIER = 1.5; // ~93% service level (1.5 sigma)

interface ReorderSuggestion {
  itemId: number;
  itemCode: string;
  itemName: string;
  brand: string | null;
  unit: string;
  currentStock: number;
  currentMinStock: number;
  suggestedMinStock: number;
  difference: number;
  avgMonthlyConsumption: number;
  consumptionStdDev: number;
  leadTimeDays: number;
  safetyBuffer: number;
  totalReorders: number;
  lastSupplier: string | null;
  lastSupplierLeadTime: number;
}

// ============================================================
// Calculate standard deviation
// ============================================================
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(avgSquaredDiff);
}

// ============================================================
// Get reorder suggestions for all active items
// ============================================================
export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const now = new Date();
  const lookbackDate = new Date(now);
  lookbackDate.setMonth(lookbackDate.getMonth() - LOOKBACK_MONTHS);
  lookbackDate.setHours(0, 0, 0, 0);

  // Get all active items
  const items = await prisma.items.findMany({
    where: { is_active: true },
    select: {
      id: true,
      item_code: true,
      item_name: true,
      brand: true,
      unit: true,
      current_stock: true,
      min_stock: true,
    },
    orderBy: { item_code: 'asc' },
  });

  // Get all OUT transactions in the lookback period
  const outTxns = await prisma.transaction_items.findMany({
    where: {
      transaction: {
        txn_date: { gte: lookbackDate },
        txn_type: { in: ['OUT'] },
        is_reversed: false,
      },
    },
    include: {
      transaction: { select: { txn_date: true, supplier_id: true } },
    },
  });

  // Get supplier info for lead times
  const suppliers = await prisma.suppliers.findMany({
    select: { id: true, name: true, lead_time_days: true },
  });
  const supplierMap = new Map(suppliers.map(s => [s.id, s]));

  // Group OUT quantities by item and month
  const itemMonthlyData: Record<number, Record<string, number>> = {};
  const itemSupplierMap: Record<number, { supplierId: number; count: number }> = {};

  for (const ti of outTxns) {
    const itemId = ti.item_id;
    const d = new Date(ti.transaction.txn_date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!itemMonthlyData[itemId]) itemMonthlyData[itemId] = {};
    itemMonthlyData[itemId][monthKey] = (itemMonthlyData[itemId][monthKey] || 0) + ti.quantity;

    // Track most frequent supplier
    if (ti.transaction.supplier_id) {
      if (!itemSupplierMap[itemId]) itemSupplierMap[itemId] = { supplierId: ti.transaction.supplier_id, count: 0 };
      itemSupplierMap[itemId].count++;
    }
  }

  const results: ReorderSuggestion[] = [];

  for (const item of items) {
    const monthlyData = itemMonthlyData[item.id] || {};
    const monthlyValues = Object.values(monthlyData);

    // Calculate average monthly consumption
    const totalConsumed = monthlyValues.reduce((a, b) => a + b, 0);
    const avgMonthly = LOOKBACK_MONTHS > 0 ? totalConsumed / LOOKBACK_MONTHS : 0;

    // Calculate standard deviation
    const consumptionStd = stdDev(monthlyValues.length >= 2 ? monthlyValues : [0, 0]);

    // Determine lead time
    const supplierInfo = itemSupplierMap[item.id];
    let leadTimeDays = DEFAULT_LEAD_TIME_DAYS;
    let lastSupplier: string | null = null;
    let lastSupplierLeadTime = DEFAULT_LEAD_TIME_DAYS;

    if (supplierInfo) {
      const supplier = supplierMap.get(supplierInfo.supplierId);
      if (supplier) {
        leadTimeDays = supplier.lead_time_days;
        lastSupplier = supplier.name;
        lastSupplierLeadTime = supplier.lead_time_days;
      }
    }

    // Calculate suggested min_stock
    // = (avg monthly consumption * lead_time_days / 30) + safety buffer
    const leadTimeConsumption = avgMonthly * (leadTimeDays / 30);
    const safetyBuffer = consumptionStd * SAFETY_BUFFER_MULTIPLIER * Math.sqrt(leadTimeDays / 30);
    const suggestedMin = Math.ceil(leadTimeConsumption + safetyBuffer);

    results.push({
      itemId: item.id,
      itemCode: item.item_code,
      itemName: item.item_name,
      brand: item.brand,
      unit: item.unit,
      currentStock: item.current_stock,
      currentMinStock: item.min_stock,
      suggestedMinStock: suggestedMin,
      difference: suggestedMin - item.min_stock,
      avgMonthlyConsumption: Math.round(avgMonthly * 100) / 100,
      consumptionStdDev: Math.round(consumptionStd * 100) / 100,
      leadTimeDays,
      safetyBuffer: Math.round(safetyBuffer * 100) / 100,
      totalReorders: monthlyValues.length,
      lastSupplier,
      lastSupplierLeadTime,
    });
  }

  return results;
}

// ============================================================
// Accept suggestion for a single item
// ============================================================
export async function acceptSuggestion(itemId: number): Promise<{ success: boolean; newMinStock: number }> {
  const suggestions = await getReorderSuggestions();
  const suggestion = suggestions.find(s => s.itemId === itemId);

  if (!suggestion) {
    throw new Error('Item not found or no suggestion available');
  }

  await prisma.items.update({
    where: { id: itemId },
    data: { min_stock: suggestion.suggestedMinStock },
  });

  return { success: true, newMinStock: suggestion.suggestedMinStock };
}

// ============================================================
// Accept suggestions for multiple items (bulk)
// ============================================================
export async function acceptBulkSuggestions(itemIds: number[]): Promise<{ accepted: number; failed: number }> {
  const suggestions = await getReorderSuggestions();
  const suggestionMap = new Map(suggestions.map(s => [s.itemId, s]));

  let accepted = 0;
  let failed = 0;

  // Use a transaction for atomicity
  await prisma.$transaction(async (tx) => {
    for (const itemId of itemIds) {
      const suggestion = suggestionMap.get(itemId);
      if (!suggestion) {
        failed++;
        continue;
      }

      await tx.items.update({
        where: { id: itemId },
        data: { min_stock: suggestion.suggestedMinStock },
      });
      accepted++;
    }
  });

  return { accepted, failed };
}
