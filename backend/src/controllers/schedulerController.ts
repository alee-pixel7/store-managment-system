// Scheduler Controller
// Handles HTTP requests for scheduler settings and operations

import { Request, Response } from 'express';
import { getSchedulerStatus, updateSchedulerSettings, generateDailyPDF } from '../services/reportScheduler';
import { getQueueStatus, clearEmailQueue, processEmailQueue } from '../services/emailService';
import { loadSettings } from '../services/schedulerSettings';

// ============================================================
// GET /api/scheduler/status - Get scheduler status
// ============================================================
export function getStatus(req: Request, res: Response) {
  try {
    const status = getSchedulerStatus();
    const queue = getQueueStatus();
    res.json({ ...status, emailQueue: { pending: queue.pending, sent: queue.sent, failed: queue.failed } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get status';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// PUT /api/scheduler/settings - Update scheduler settings
// ============================================================
export function updateSettings(req: Request, res: Response) {
  try {
    const { enabled, cronTime, recipientEmail, senderEmail } = req.body;
    const patch: Record<string, any> = {};

    if (enabled !== undefined) patch.enabled = Boolean(enabled);
    if (cronTime !== undefined) {
      // Validate cron expression
      const cron = require('node-cron');
      if (!cron.validate(cronTime)) {
        return res.status(400).json({ error: `Invalid cron expression: ${cronTime}` });
      }
      patch.cronTime = cronTime;
    }
    if (recipientEmail !== undefined) patch.recipientEmail = recipientEmail;
    if (senderEmail !== undefined) patch.senderEmail = senderEmail;

    const updated = updateSchedulerSettings(patch);
    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// POST /api/scheduler/run-now - Generate report immediately
// ============================================================
export function runNow(req: Request, res: Response) {
  (async () => {
    try {
      const { date } = req.body;
      const result = await generateDailyPDF(date);
      res.json({ message: 'Report generated successfully', ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate report';
      res.status(500).json({ error: message });
    }
  })();
}

// ============================================================
// GET /api/scheduler/queue - Get email queue status
// ============================================================
export function getQueue(req: Request, res: Response) {
  try {
    const queue = getQueueStatus();
    res.json(queue);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get queue';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/scheduler/queue/retry - Retry pending emails
// ============================================================
export async function retryQueue(req: Request, res: Response) {
  try {
    const result = await processEmailQueue();
    res.json({ message: 'Queue processed', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process queue';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// DELETE /api/scheduler/queue - Clear email queue
// ============================================================
export function clearQueue(req: Request, res: Response) {
  try {
    clearEmailQueue();
    res.json({ message: 'Queue cleared' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear queue';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/scheduler/reports - List generated reports
// ============================================================
export function listReports(req: Request, res: Response) {
  try {
    const reportsDir = require('path').join(__dirname, '../../reports/daily');
    if (!require('fs').existsSync(reportsDir)) {
      return res.json({ reports: [] });
    }
    const files = require('fs').readdirSync(reportsDir)
      .filter((f: string) => f.endsWith('.pdf'))
      .sort()
      .reverse()
      .map((f: string) => {
        const stats = require('fs').statSync(require('path').join(reportsDir, f));
        return { filename: f, size: stats.size, createdAt: stats.mtime };
      });
    res.json({ reports: files });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list reports';
    res.status(500).json({ error: message });
  }
}
