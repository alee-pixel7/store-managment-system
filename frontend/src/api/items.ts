// API Client for Items
// All API calls to the backend

import { authFetch } from './fetch';
import type {
  Item,
  ItemWithTransactions,
  PaginatedResponse,
  SearchItem,
  CreateItemInput,
  UpdateItemInput,
  Category,
  ItemLedgerResponse,
} from '../types';

// ============================================================
// ITEMS API
// ============================================================

export async function listItems(params: {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  low_stock?: boolean;
  out_of_stock?: boolean;
  is_active?: boolean;
}): Promise<PaginatedResponse<Item>> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.category_id) searchParams.set('category_id', String(params.category_id));
  if (params.low_stock !== undefined) searchParams.set('low_stock', String(params.low_stock));
  if (params.out_of_stock !== undefined) searchParams.set('out_of_stock', String(params.out_of_stock));
  if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));

  const query = searchParams.toString();
  return authFetch<PaginatedResponse<Item>>(`/items${query ? `?${query}` : ''}`);
}

export async function getItemById(id: number): Promise<ItemWithTransactions> {
  return authFetch<ItemWithTransactions>(`/items/${id}`);
}

export async function searchItems(query: string): Promise<SearchItem[]> {
  return authFetch<SearchItem[]>(`/items/search?q=${encodeURIComponent(query)}`);
}

export async function createItem(data: CreateItemInput): Promise<Item> {
  return authFetch<Item>('/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateItem(id: number, data: UpdateItemInput): Promise<Item> {
  return authFetch<Item>(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function softDeleteItem(id: number): Promise<{ message: string; item: Item }> {
  return authFetch<{ message: string; item: Item }>(`/items/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================
// CATEGORIES API (for dropdown)
// ============================================================

export async function listCategories(): Promise<Category[]> {
  return authFetch<Category[]>('/items/categories');
}

// ============================================================
// ITEM LEDGER API
// ============================================================

export async function getItemLedger(
  itemId: number,
  params: {
    from?: string;
    to?: string;
    type?: string;
  } = {}
): Promise<ItemLedgerResponse> {
  const searchParams = new URLSearchParams();

  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.type) searchParams.set('type', params.type);

  const query = searchParams.toString();
  return authFetch<ItemLedgerResponse>(`/items/${itemId}/ledger${query ? `?${query}` : ''}`);
}
