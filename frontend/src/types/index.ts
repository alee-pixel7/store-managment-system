// TypeScript Types for the Store Management System

export interface Category {
  id: number;
  name: string;
  _count?: { items: number };
}

export interface ItemAlias {
  id: number;
  alias_name: string;
}

export interface Item {
  id: number;
  item_code: string;
  item_name: string;
  category_id: number | null;
  category: Category | null;
  brand: string | null;
  unit: string;
  min_stock: number;
  rack_location: string | null;
  current_stock: number;
  last_rate: number | null;
  barcode: string | null;
  image_path: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_aliases: ItemAlias[];
}

export interface ItemWithTransactions extends Item {
  recentTransactions: Transaction[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchItem {
  id: number;
  item_code: string;
  item_name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  rack_location: string | null;
  category_id: number | null;
  category: { id: number; name: string } | null;
  brand: string | null;
}

export interface CreateItemInput {
  item_code: string;
  item_name: string;
  category_id?: number;
  brand?: string;
  unit: string;
  min_stock?: number;
  rack_location?: string;
  notes?: string;
  aliases?: string[];
}

export interface UpdateItemInput {
  item_code?: string;
  item_name?: string;
  category_id?: number | null;
  brand?: string | null;
  unit?: string;
  min_stock?: number;
  rack_location?: string | null;
  notes?: string | null;
  aliases?: string[];
}

// ============================================================
// SUPPLIER TYPES
// ============================================================
export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface CreateSupplierInput {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// ============================================================
// TRANSACTION TYPES
// ============================================================
export interface TransactionItem {
  id: number;
  transaction_id: number;
  item_id: number;
  quantity: number;
  rate: number | null;
  line_remarks: string | null;
  item: {
    id: number;
    item_code: string;
    item_name: string;
    unit: string;
    current_stock: number;
  };
}

export interface Transaction {
  id: number;
  txn_no: string;
  txn_type: string;
  txn_date: string;
  supplier_id: number | null;
  invoice_no: string | null;
  department_id: number | null;
  machine_id: number | null;
  person_id: number | null;
  purpose: string | null;
  remarks: string | null;
  reverses_txn_id: number | null;
  is_reversed: boolean;
  created_by: number;
  created_at: string;
  supplier: { id: number; name: string } | null;
  creator: { id: number; full_name: string } | null;
  person: { id: number; name: string } | null;
  department: { id: number; name: string } | null;
  transaction_items?: TransactionItem[];
}

export interface CreateStockInInput {
  txn_date?: string;
  supplier_id?: number;
  invoice_no?: string;
  remarks?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    rate?: number;
    line_remarks?: string;
  }>;
}

// ============================================================
// STOCK IN FORM TYPES
// ============================================================
export interface StockInLineItem {
  id: string; // Temporary ID for React key
  item_id: number;
  item_code: string;
  item_name: string;
  current_stock: number;
  unit: string;
  quantity: string;
  rate: string;
  line_remarks: string;
}

// ============================================================
// STOCK OUT TYPES
// ============================================================
export interface Department {
  id: number;
  name: string;
}

export interface Machine {
  id: number;
  name: string;
  code: string | null;
  department_id: number | null;
  department: { id: number; name: string } | null;
}

export interface Person {
  id: number;
  name: string;
  department_id: number | null;
  phone: string | null;
  department: { id: number; name: string } | null;
}

export interface CreateStockOutInput {
  txn_date?: string;
  department_id?: number;
  machine_id?: number;
  person_id?: number;
  purpose?: string;
  remarks?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    line_remarks?: string;
  }>;
}

// ============================================================
// RETURN TYPES
// ============================================================
export interface CreateReturnInput {
  txn_date?: string;
  supplier_id?: number;
  remarks?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    line_remarks?: string;
  }>;
}

export interface StockOutLineItem {
  id: string;
  item_id: number;
  item_code: string;
  item_name: string;
  current_stock: number;
  unit: string;
  quantity: string;
  line_remarks: string;
  warning?: string;
}

export interface StockOutResponse {
  transaction: Transaction;
  warnings: Array<{
    item_id: number;
    item_code: string;
    message: string;
  }>;
}

// ============================================================
// ITEM DETAIL / LEDGER TYPES
// ============================================================
export interface ItemDetail {
  id: number;
  item_code: string;
  item_name: string;
  brand: string | null;
  unit: string;
  rack_location: string | null;
  current_stock: number;
  min_stock: number;
  last_rate: number | null;
  category: { id: number; name: string } | null;
}

export interface LedgerEntry {
  id: number;
  date: string;
  txn_no: string;
  txn_type: string;
  in_qty: number | null;
  out_qty: number | null;
  running_balance: number;
  rate: number | null;
  party: string;
  purpose: string | null;
  remarks: string | null;
  is_reversed: boolean;
  created_by: string;
}

export interface ItemLedgerResponse {
  item: ItemDetail;
  ledger: LedgerEntry[];
}
