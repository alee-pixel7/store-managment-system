// Scheduler Settings Store
// Persists scheduler configuration to a JSON file

import * as fs from 'fs';
import * as path from 'path';

const SETTINGS_PATH = path.join(__dirname, '../../scheduler-settings.json');

export interface SchedulerSettings {
  enabled: boolean;
  cronTime: string;       // e.g. "0 18 * * *" for 6:00 PM daily
  recipientEmail: string;
  senderEmail: string;
  lastRun: string | null; // ISO date string
  lastStatus: 'success' | 'error' | null;
  lastError: string | null;
}

const DEFAULT_SETTINGS: SchedulerSettings = {
  enabled: false,
  cronTime: '0 18 * * *',  // 6:00 PM daily
  recipientEmail: '',
  senderEmail: '',
  lastRun: null,
  lastStatus: null,
  lastError: null,
};

function ensureDir() {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadSettings(): SchedulerSettings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: SchedulerSettings): void {
  ensureDir();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

export function updateSettings(patch: Partial<SchedulerSettings>): SchedulerSettings {
  const current = loadSettings();
  const updated = { ...current, ...patch };
  saveSettings(updated);
  return updated;
}
