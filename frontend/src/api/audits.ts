// Audit API Client

import { authFetch } from './fetch';

export interface AuditSummary {
  id: number;
  auditDate: string;
  status: string;
  createdBy: string;
  notes: string | null;
  totalItems: number;
  countedItems: number;
  variances: number;
}

export interface AuditLine {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  brand: string | null;
  unit: string;
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
  countedAt: string | null;
  countedBy: string | null;
}

export interface AuditDetail extends AuditSummary {
  lines: AuditLine[];
}

export interface VarianceItem {
  itemCode: string;
  itemName: string;
  brand: string | null;
  unit: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  varianceValue: number;
  rate: number;
}

export interface VarianceReport {
  auditId: number;
  auditDate: string;
  totalItems: number;
  itemsWithVariance: number;
  totalVarianceValue: number;
  variances: VarianceItem[];
}

export interface SearchResult {
  lineId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  brand: string | null;
  unit: string;
  rackLocation: string | null;
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
}

export async function listAudits(): Promise<{ audits: AuditSummary[] }> {
  return authFetch('/audits');
}

export async function startAudit(notes?: string): Promise<AuditSummary> {
  return authFetch('/audits', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function getAudit(id: number): Promise<AuditDetail> {
  return authFetch(`/audits/${id}`);
}

export async function countItem(
  auditId: number,
  itemId: number,
  countedQty: number,
  countedBy: string
): Promise<void> {
  return authFetch(`/audits/${auditId}/count`, {
    method: 'POST',
    body: JSON.stringify({ itemId, countedQty, countedBy }),
  });
}

export async function searchAuditItems(auditId: number, query: string): Promise<{ items: SearchResult[] }> {
  return authFetch(`/audits/${auditId}/search?q=${encodeURIComponent(query)}`);
}

export async function getVarianceReport(auditId: number): Promise<VarianceReport> {
  return authFetch(`/audits/${auditId}/variance`);
}

export async function finaliseAudit(auditId: number): Promise<void> {
  return authFetch(`/audits/${auditId}/finalise`, {
    method: 'POST',
  });
}
