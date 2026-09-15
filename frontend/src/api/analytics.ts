// Analytics API Client

import { authFetch } from './fetch';

export interface ConsumptionTrend {
  month: string;
  quantity: number;
  value: number;
}

export interface MachineConsumption {
  machineId: number;
  machineName: string;
  totalQty: number;
  totalValue: number;
  items: number;
}

export interface UnusualConsumption {
  machineId: number;
  machineName: string;
  currentMonthQty: number;
  sixMonthAvgQty: number;
  percentAbove: number;
  topItems: Array<{ itemCode: string; itemName: string; qty: number }>;
}

export interface ReorderInterval {
  itemId: number;
  itemCode: string;
  itemName: string;
  brand: string | null;
  unit: string;
  currentStock: number;
  avgDaysBetweenReorders: number | null;
  lastReceivedDate: string | null;
  totalReorders: number;
}

export interface DeadStockItem {
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
}

export interface StockValueTrend {
  month: string;
  stockValue: number;
  inValue: number;
  outValue: number;
}

export async function getConsumptionTrend(itemId: number, months?: number): Promise<ConsumptionTrend[]> {
  const params = new URLSearchParams({ itemId: String(itemId) });
  if (months) params.set('months', String(months));
  return authFetch(`/analytics/consumption-trend?${params}`);
}

export async function getMachineConsumption(year?: number, month?: number): Promise<MachineConsumption[]> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  return authFetch(`/analytics/machine-consumption?${params}`);
}

export async function getUnusualConsumption(): Promise<UnusualConsumption[]> {
  return authFetch('/analytics/unusual-consumption');
}

export async function getReorderInterval(): Promise<ReorderInterval[]> {
  return authFetch('/analytics/reorder-interval');
}

export async function getDeadStock(): Promise<DeadStockItem[]> {
  return authFetch('/analytics/dead-stock');
}

export async function getStockValueTrend(): Promise<StockValueTrend[]> {
  return authFetch('/analytics/stock-value-trend');
}
