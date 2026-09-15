// Scheduler API Client

import { authFetch } from './fetch';

export interface SchedulerStatus {
  enabled: boolean;
  cronTime: string;
  recipientEmail: string;
  senderEmail: string;
  lastRun: string | null;
  lastStatus: 'success' | 'error' | null;
  lastError: string | null;
  isRunning: boolean;
  nextRun: string | null;
  emailQueue: {
    pending: number;
    sent: number;
    failed: number;
  };
}

export interface ReportFile {
  filename: string;
  size: number;
  createdAt: string;
}

export interface EmailQueueEntry {
  id: string;
  to: string;
  subject: string;
  createdAt: string;
  retries: number;
  status: 'pending' | 'sent' | 'failed';
}

export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  return authFetch('/scheduler/status');
}

export async function updateSchedulerSettings(settings: {
  enabled?: boolean;
  cronTime?: string;
  recipientEmail?: string;
  senderEmail?: string;
}): Promise<SchedulerStatus> {
  return authFetch('/scheduler/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function runNow(date?: string): Promise<{ message: string; filePath: string; date: string }> {
  return authFetch('/scheduler/run-now', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

export async function getReports(): Promise<{ reports: ReportFile[] }> {
  return authFetch('/scheduler/reports');
}

export async function getEmailQueue(): Promise<{
  pending: number;
  sent: number;
  failed: number;
  emails: EmailQueueEntry[];
}> {
  return authFetch('/scheduler/queue');
}

export async function retryEmailQueue(): Promise<{ sent: number; failed: number }> {
  return authFetch('/scheduler/queue/retry', { method: 'POST' });
}

export async function clearEmailQueue(): Promise<void> {
  return authFetch('/scheduler/queue', { method: 'DELETE' });
}
