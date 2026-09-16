// API Client for Transactions
// All API calls to the backend for transaction operations

import { authFetch } from './fetch';
import type {
  Transaction,
  PaginatedResponse,
  CreateStockInInput,
  CreateStockOutInput,
  CreateReturnInput,
  StockOutResponse,
  Supplier,
  CreateSupplierInput,
  Person,
  Department,
  Machine,
  SearchItem,
} from '../types';

// ============================================================
// STOCK IN API
// ============================================================

export async function createStockIn(data: CreateStockInInput): Promise<Transaction> {
  return authFetch<Transaction>('/transactions/in', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// TRANSACTIONS API
// ============================================================

export async function listTransactions(params: {
  page?: number;
  limit?: number;
  txn_type?: string;
  from_date?: string;
  to_date?: string;
}): Promise<PaginatedResponse<Transaction>> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.txn_type) searchParams.set('txn_type', params.txn_type);
  if (params.from_date) searchParams.set('from_date', params.from_date);
  if (params.to_date) searchParams.set('to_date', params.to_date);

  const query = searchParams.toString();
  return authFetch<PaginatedResponse<Transaction>>(`/transactions${query ? `?${query}` : ''}`);
}

export async function getTransactionById(id: number): Promise<Transaction> {
  return authFetch<Transaction>(`/transactions/${id}`);
}

// ============================================================
// SUPPLIERS API
// ============================================================

export async function listSuppliers(): Promise<Supplier[]> {
  return authFetch<Supplier[]>('/transactions/suppliers');
}

export async function createSupplier(data: CreateSupplierInput): Promise<Supplier> {
  return authFetch<Supplier>('/transactions/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// STOCK OUT API
// ============================================================

export async function createStockOut(data: CreateStockOutInput): Promise<StockOutResponse> {
  return authFetch<StockOutResponse>('/transactions/out', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// ITEMS SEARCH (reused from items API)
// ============================================================

export async function searchItems(query: string): Promise<SearchItem[]> {
  return authFetch<SearchItem[]>(`/items/search?q=${encodeURIComponent(query)}`);
}

// ============================================================
// PERSONS API
// ============================================================

export async function listPersons(): Promise<Person[]> {
  return authFetch<Person[]>('/transactions/persons');
}

export async function createPerson(data: { name: string; department_id?: number; phone?: string }): Promise<Person> {
  return authFetch<Person>('/transactions/persons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// DEPARTMENTS API
// ============================================================

export async function listDepartments(): Promise<Department[]> {
  return authFetch<Department[]>('/transactions/departments');
}

export async function createDepartment(data: { name: string }): Promise<Department> {
  return authFetch<Department>('/transactions/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// MACHINES API
// ============================================================

export async function listMachines(departmentId?: number): Promise<Machine[]> {
  const query = departmentId ? `?department_id=${departmentId}` : '';
  return authFetch<Machine[]>(`/transactions/machines${query}`);
}

export async function createMachine(data: { name: string; code?: string; department_id?: number }): Promise<Machine> {
  return authFetch<Machine>('/transactions/machines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// REVERSE TRANSACTION API
// ============================================================

export async function reverseTransaction(txnId: number, reason: string): Promise<Transaction> {
  return authFetch<Transaction>(`/transactions/${txnId}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function reverseTransactionByNo(txnNo: string, reason: string, force: boolean = false): Promise<Transaction> {
  return authFetch<Transaction>('/transactions/by-no/reverse', {
    method: 'POST',
    body: JSON.stringify({ txn_no: txnNo, reason, force }),
  });
}

// ============================================================
// RETURN TRANSACTION API
// ============================================================

export async function createReturn(data: CreateReturnInput): Promise<Transaction> {
  return authFetch<Transaction>('/transactions/return', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
