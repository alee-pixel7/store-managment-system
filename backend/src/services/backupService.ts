// Backup Service Layer
// Handles SQLite database backup, cleanup, and restoration

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
const DB_URL = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const DB_PATH_RAW = DB_URL.replace('file:', '');
// Prisma resolves file:./dev.db relative to schema.prisma (prisma/ folder)
const DB_PATH = path.isAbsolute(DB_PATH_RAW)
  ? DB_PATH_RAW
  : path.resolve(__dirname, '../../prisma', DB_PATH_RAW);
const KEEP_DAYS = 30;
const MAX_DAILY_BACKUPS = 3;
const BACKUP_PREFIX = 'store-';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: Date;
  isMonthly: boolean;
}

// ============================================================
// ENSURE BACKUP DIRECTORY EXISTS
// ============================================================
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ============================================================
// CREATE BACKUP
// ============================================================
export async function createBackup(): Promise<BackupInfo> {
  ensureBackupDir();

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `${BACKUP_PREFIX}${dateStr}.db`;
  const backupPath = path.join(BACKUP_DIR, filename);

  // If backup for today already exists, overwrite it (don't create timestamped copies)
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ Backup updated: ${filename}`);
    await cleanupOldBackups();
    return getBackupInfo(filename);
  }

  // Copy database file
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`✅ Backup created: ${filename}`);

  // Cap daily backups — keep only newest 3 per day
  capDailyBackups();

  // Run cleanup
  await cleanupOldBackups();

  return getBackupInfo(filename);
}

// ============================================================
// GET BACKUP INFO
// ============================================================
function getBackupInfo(filename: string): BackupInfo {
  const filePath = path.join(BACKUP_DIR, filename);
  const stats = fs.statSync(filePath);

  // Extract date from filename
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const createdAt = dateMatch ? new Date(dateMatch[1]) : stats.birthtime;

  // Check if this is the first backup of the month
  const isMonthly = isFirstBackupOfMonth(filename, createdAt);

  return {
    filename,
    size: stats.size,
    createdAt,
    isMonthly,
  };
}

// ============================================================
// CHECK IF FIRST BACKUP OF MONTH
// ============================================================
function isFirstBackupOfMonth(filename: string, date: Date): boolean {
  const monthStr = filename.substring(6, 13); // YYYY-MM
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))
    .filter((f) => f.substring(6, 13) === monthStr)
    .sort();

  return backups.length > 0 && backups[0] === filename;
}

// ============================================================
// CAP DAILY BACKUPS — keep only newest MAX_DAILY_BACKUPS per day
// ============================================================
function capDailyBackups() {
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))
    .sort()
    .reverse(); // newest first

  // Group by date
  const byDate = new Map<string, string[]>();
  for (const f of backups) {
    const dateMatch = f.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const date = dateMatch[1];
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(f);
  }

  // Delete excess backups per day
  let deleted = 0;
  for (const [, files] of byDate) {
    if (files.length > MAX_DAILY_BACKUPS) {
      // files is sorted newest-first, so delete from the end (oldest)
      const toDelete = files.slice(MAX_DAILY_BACKUPS);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`🗑️  Capped daily backup: ${f}`);
        deleted++;
      }
    }
  }
  if (deleted > 0) {
    console.log(`📦 Cleaned ${deleted} excess daily backups (keeping ${MAX_DAILY_BACKUPS}/day)`);
  }
}

// ============================================================
// CLEANUP OLD BACKUPS
// ============================================================
export async function cleanupOldBackups(): Promise<number> {
  ensureBackupDir();

  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - KEEP_DAYS);

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))
    .sort();

  let deletedCount = 0;

  for (const filename of backups) {
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;

    const fileDate = new Date(dateMatch[1]);

    // Keep if within retention period
    if (fileDate >= cutoffDate) continue;

    // Keep if it's the first backup of any month
    const monthStr = filename.substring(6, 13);
    const isFirstOfMonth = backups
      .filter((f) => f.substring(6, 13) === monthStr)
      .sort()[0] === filename;

    if (isFirstOfMonth) {
      console.log(`📦 Keeping monthly backup: ${filename}`);
      continue;
    }

    // Delete old backup
    const filePath = path.join(BACKUP_DIR, filename);
    fs.unlinkSync(filePath);
    console.log(`🗑️  Deleted old backup: ${filename}`);
    deletedCount++;
  }

  return deletedCount;
}

// ============================================================
// LIST BACKUPS
// ============================================================
export function listBackups(): BackupInfo[] {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))
    .sort()
    .reverse(); // Newest first

  return files.map((filename) => {
    const filePath = path.join(BACKUP_DIR, filename);
    const stats = fs.statSync(filePath);
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    const createdAt = dateMatch ? new Date(dateMatch[1]) : stats.birthtime;

    return {
      filename,
      size: stats.size,
      createdAt,
      isMonthly: false, // Will be calculated below
    };
  }).map((info) => ({
    ...info,
    isMonthly: isFirstBackupOfMonth(info.filename, info.createdAt),
  }));
}

// ============================================================
// GET BACKUP PATH
// ============================================================
export function getBackupPath(filename: string): string | null {
  // Security: only allow backup files matching pattern
  if (!filename.startsWith(BACKUP_PREFIX) || !filename.endsWith('.db')) {
    return null;
  }

  // Security: prevent path traversal — basename must equal filename
  if (path.basename(filename) !== filename) {
    return null;
  }

  const filePath = path.join(BACKUP_DIR, filename);

  // Security: resolved path must be inside BACKUP_DIR
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(BACKUP_DIR))) {
    return null;
  }

  if (!fs.existsSync(resolved)) {
    return null;
  }

  return resolved;
}

// ============================================================
// START PERIODIC BACKUP
// ============================================================
let backupInterval: NodeJS.Timeout | null = null;

export function startPeriodicBackup() {
  // Run on startup
  createBackup().catch((err) => {
    console.error('❌ Backup failed on startup:', err);
  });

  // Run every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  backupInterval = setInterval(() => {
    createBackup().catch((err) => {
      console.error('❌ Scheduled backup failed:', err);
    });
  }, TWENTY_FOUR_HOURS);

  console.log('⏰ Periodic backup scheduled (every 24 hours)');
}

export function stopPeriodicBackup() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
}
