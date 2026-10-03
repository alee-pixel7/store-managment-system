// API Client for admin operations

import { authFetch } from './fetch';

export interface FactoryResetResult {
  message: string;
  backupsCleared: number;
  reportsCleared: number;
}

export async function factoryReset(confirm: string): Promise<FactoryResetResult> {
  return authFetch<FactoryResetResult>('/admin/factory-reset', {
    method: 'POST',
    body: JSON.stringify({ confirm }),
  });
}
