// Backup API Client

import { authFetch } from './fetch';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
  isMonthly: boolean;
}

export async function createBackup(): Promise<{ message: string; backup: BackupInfo }> {
  return authFetch('/backup/now', { method: 'POST' });
}

export async function listBackups(): Promise<{ backups: BackupInfo[] }> {
  return authFetch('/backup/list');
}

export function getDownloadUrl(filename: string): string {
  return `/api/backup/download/${filename}`;
}

export async function restoreBackup(filename: string): Promise<{ message: string; safetyBackup: string }> {
  return authFetch(`/backup/restore/${filename}`, { method: 'POST' });
}
