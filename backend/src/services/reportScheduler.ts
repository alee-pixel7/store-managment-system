// Report Scheduler Service
// Runs node-cron to generate daily PDF reports and optionally email them

import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { loadSettings, saveSettings, updateSettings } from './schedulerSettings';
import { getDailyReport } from './reportService';
import { exportDailyReportPDF } from './pdfExportService';
import { sendReportEmail, startEmailRetryTimer } from './emailService';

const REPORTS_DIR = process.env.REPORT_DIR
  ? path.join(process.env.REPORT_DIR, 'daily')
  : path.join(__dirname, '../../reports/daily');

let scheduledTask: cron.ScheduledTask | null = null;

// ============================================================
// ENSURE REPORTS DIRECTORY
// ============================================================
function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

// ============================================================
// GENERATE DAILY REPORT PDF
// ============================================================
export async function generateDailyPDF(dateStr?: string): Promise<{ filePath: string; date: string }> {
  ensureReportsDir();

  // Default to yesterday if no date provided (end-of-day report)
  const reportDate = dateStr || getYesterday();
  const report = await getDailyReport(reportDate);
  const pdfBuffer = await exportDailyReportPDF(report);

  const filename = `${reportDate}.pdf`;
  const filePath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filePath, pdfBuffer);

  console.log(`📄 Daily report generated: ${filename}`);
  return { filePath, date: reportDate };
}

// ============================================================
// RUN SCHEDULED JOB
// ============================================================
async function runScheduledJob() {
  const settings = loadSettings();
  const now = new Date();
  const yesterday = getYesterday();

  console.log(`⏰ Running scheduled daily report for ${yesterday}...`);

  try {
    // Generate PDF
    const { filePath } = await generateDailyPDF(yesterday);

    // Update settings with last run info
    updateSettings({
      lastRun: now.toISOString(),
      lastStatus: 'success',
      lastError: null,
    });

    // Send email if configured
    if (settings.recipientEmail && settings.senderEmail) {
      const emailResult = await sendReportEmail(
        settings.recipientEmail,
        `Daily Stock Report - ${yesterday}`,
        `Please find attached the daily stock report for ${yesterday}.\n\nThis is an automated email from Store Management System.`,
        [{ filename: `Daily-Report-${yesterday}.pdf`, path: filePath }]
      );

      if (emailResult.sent) {
        console.log(`📧 Report emailed to ${settings.recipientEmail}`);
      } else if (emailResult.queued) {
        console.log(`📧 Email queued (will retry when online): ${emailResult.error}`);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Scheduled report failed: ${errorMsg}`);
    updateSettings({
      lastRun: now.toISOString(),
      lastStatus: 'error',
      lastError: errorMsg,
    });
  }
}

// ============================================================
// GET YESTERDAY'S DATE
// ============================================================
function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ============================================================
// START SCHEDULER
// ============================================================
export function startScheduler() {
  stopScheduler(); // Clear any existing

  const settings = loadSettings();
  startEmailRetryTimer();

  if (!settings.enabled) {
    console.log('⏰ Report scheduler is disabled');
    return;
  }

  if (!cron.validate(settings.cronTime)) {
    console.error(`❌ Invalid cron expression: ${settings.cronTime}`);
    return;
  }

  scheduledTask = cron.schedule(settings.cronTime, () => {
    runScheduledJob();
  });

  console.log(`⏰ Report scheduler started: ${settings.cronTime}`);
}

// ============================================================
// STOP SCHEDULER
// ============================================================
export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

// ============================================================
// RESTART SCHEDULER (after settings change)
// ============================================================
export function restartScheduler() {
  stopScheduler();
  startScheduler();
}

// ============================================================
// GET STATUS
// ============================================================
export function getSchedulerStatus() {
  const settings = loadSettings();
  return {
    ...settings,
    isRunning: scheduledTask !== null,
    nextRun: scheduledTask ? getNextRunTime(settings.cronTime) : null,
  };
}

// ============================================================
// CALCULATE NEXT RUN TIME
// ============================================================
function getNextRunTime(cronExpr: string): string | null {
  try {
    const interval = cron.getTasks().values().next().value;
    // Fallback: just show the cron expression
    return `Next run per schedule: ${cronExpr}`;
  } catch {
    return null;
  }
}

// ============================================================
// UPDATE SETTINGS AND RESTART
// ============================================================
export function updateSchedulerSettings(patch: Partial<ReturnType<typeof loadSettings>>) {
  const updated = updateSettings(patch);
  restartScheduler();
  return updated;
}
