// Reports API Client

import { authFetch } from './fetch';

export interface DailyReport {
  date: string;
  summary: {
    totalReceipts: number;
    totalIssues: number;
    totalReturns: number;
    totalTransactions: number;
    totalReceiptQty: number;
    totalIssueQty: number;
    totalReturnQty: number;
  };
  receipts: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    qty: number;
    rate: number;
    total: number;
    supplier: string;
    invoiceNo: string;
    txnNo: string;
  }>;
  issues: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    qty: number;
    issuedTo: string;
    department: string | null;
    machine: string | null;
    purpose: string;
    txnNo: string;
  }>;
  itemsBelowMinimum: Array<{
    itemCode: string;
    itemName: string;
    brand: string | null;
    currentStock: number;
    minStock: number;
    unit: string;
  }>;
}

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

export async function getDailyReport(date: string): Promise<DailyReport> {
  return authFetch(`/reports/daily?date=${date}`);
}

export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  return authFetch(`/reports/monthly?year=${year}&month=${month}`);
}
