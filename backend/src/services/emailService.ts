// Email Service
// Sends emails via nodemailer with queue and retry for offline scenarios

import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

const QUEUE_PATH = path.join(__dirname, '../../email-queue.json');
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface QueuedEmail {
  id: string;
  to: string;
  subject: string;
  text: string;
  attachments: Array<{ filename: string; path: string }>;
  createdAt: string;
  retries: number;
  lastAttempt: string | null;
  lastError: string | null;
  status: 'pending' | 'sent' | 'failed';
}

// ============================================================
// TRANSPORT (lazy init from env)
// ============================================================
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

// ============================================================
// QUEUE MANAGEMENT
// ============================================================
function loadQueue(): QueuedEmail[] {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedEmail[]): void {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf-8');
}

function enqueue(email: Omit<QueuedEmail, 'id' | 'createdAt' | 'retries' | 'lastAttempt' | 'lastError' | 'status'>): QueuedEmail {
  const queue = loadQueue();
  const entry: QueuedEmail = {
    ...email,
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    retries: 0,
    lastAttempt: null,
    lastError: null,
    status: 'pending',
  };
  queue.push(entry);
  saveQueue(queue);
  return entry;
}

// ============================================================
// SEND EMAIL (with immediate attempt)
// ============================================================
export async function sendReportEmail(
  to: string,
  subject: string,
  text: string,
  attachments: Array<{ filename: string; path: string }>
): Promise<{ sent: boolean; queued: boolean; error?: string }> {
  const transport = createTransport();

  // No SMTP configured — just queue for later
  if (!transport) {
    enqueue({ to, subject, text, attachments });
    return { sent: false, queued: true, error: 'SMTP not configured' };
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      attachments,
    });
    return { sent: true, queued: false };
  } catch (err) {
    // Network error — queue for retry
    const errorMsg = err instanceof Error ? err.message : String(err);
    enqueue({ to, subject, text, attachments });
    return { sent: false, queued: true, error: errorMsg };
  }
}

// ============================================================
// PROCESS QUEUE (retry pending emails)
// ============================================================
export async function processEmailQueue(): Promise<{ sent: number; failed: number }> {
  const queue = loadQueue();
  const transport = createTransport();
  let sent = 0;
  let failed = 0;

  if (!transport) {
    return { sent: 0, failed: 0 };
  }

  const pending = queue.filter((e) => e.status === 'pending');

  for (const entry of pending) {
    // Check if attachments still exist
    const validAttachments = entry.attachments.filter((a) => fs.existsSync(a.path));
    if (validAttachments.length === 0 && entry.attachments.length > 0) {
      entry.status = 'failed';
      entry.lastError = 'Attachment files no longer exist';
      failed++;
      continue;
    }

    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: entry.to,
        subject: entry.subject,
        text: entry.text,
        attachments: validAttachments.length > 0 ? validAttachments : undefined,
      });
      entry.status = 'sent';
      sent++;
    } catch (err) {
      entry.retries++;
      entry.lastAttempt = new Date().toISOString();
      if (entry.retries >= MAX_RETRIES) {
        entry.status = 'failed';
        failed++;
      }
    }
  }

  saveQueue(queue);
  return { sent, failed };
}

// ============================================================
// GET QUEUE STATUS
// ============================================================
export function getQueueStatus(): {
  pending: number;
  sent: number;
  failed: number;
  emails: QueuedEmail[];
} {
  const queue = loadQueue();
  return {
    pending: queue.filter((e) => e.status === 'pending').length,
    sent: queue.filter((e) => e.status === 'sent').length,
    failed: queue.filter((e) => e.status === 'failed').length,
    emails: queue,
  };
}

// ============================================================
// CLEAR QUEUE
// ============================================================
export function clearEmailQueue(): void {
  saveQueue([]);
}

// ============================================================
// START RETRY TIMER
// ============================================================
let retryTimer: NodeJS.Timeout | null = null;

export function startEmailRetryTimer() {
  if (retryTimer) return;
  retryTimer = setInterval(async () => {
    try {
      const result = await processEmailQueue();
      if (result.sent > 0 || result.failed > 0) {
        console.log(`📧 Email queue: ${result.sent} sent, ${result.failed} failed`);
      }
    } catch (err) {
      console.error('Email queue retry error:', err);
    }
  }, RETRY_INTERVAL_MS);
  console.log('📧 Email retry timer started (every 5 minutes)');
}

export function stopEmailRetryTimer() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}
