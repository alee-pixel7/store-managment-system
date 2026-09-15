// Reorder API Client

import { authFetch } from './fetch';

export interface ReorderSuggestion {
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

export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  return authFetch('/reorder/suggestions');
}

export async function acceptSuggestion(itemId: number): Promise<{ success: boolean; newMinStock: number }> {
  return authFetch(`/reorder/accept/${itemId}`, { method: 'POST' });
}

export async function acceptBulkSuggestions(itemIds: number[]): Promise<{ accepted: number; failed: number }> {
  return authFetch('/reorder/accept-bulk', {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  });
}
