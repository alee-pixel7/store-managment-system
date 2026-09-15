// API Client for Dashboard

import { authFetch } from './fetch';

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
  return authFetch<DashboardSummary>('/dashboard/summary');
}
