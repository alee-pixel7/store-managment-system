// SchedulerSettings Component
// Settings screen for daily report scheduler, email config, and queue management

import { useState, useEffect } from 'react';
import {
  getSchedulerStatus,
  updateSchedulerSettings,
  runNow,
  getReports,
  getEmailQueue,
  retryEmailQueue,
  clearEmailQueue,
} from '../../api/scheduler';
import type { SchedulerStatus, ReportFile, EmailQueueEntry } from '../../api/scheduler';

export function SchedulerSettings() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [queue, setQueue] = useState<{ pending: number; sent: number; failed: number; emails: EmailQueueEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [cronTime, setCronTime] = useState('0 18 * * *');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statusData, reportsData, queueData] = await Promise.all([
        getSchedulerStatus(),
        getReports(),
        getEmailQueue(),
      ]);
      setStatus(statusData);
      setReports(reportsData.reports);
      setQueue(queueData);
      // Sync form
      setEnabled(statusData.enabled);
      setCronTime(statusData.cronTime);
      setRecipientEmail(statusData.recipientEmail);
      setSenderEmail(statusData.senderEmail);
    } catch (err) {
      console.error('Failed to load scheduler settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateSchedulerSettings({
        enabled,
        cronTime,
        recipientEmail,
        senderEmail,
      });
      setStatus(updated);
      setMessage({ type: 'success', text: 'Settings saved. Scheduler restarted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const result = await runNow();
      setMessage({ type: 'success', text: `Report generated: ${result.date}` });
      await loadAll();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to generate' });
    } finally {
      setRunning(false);
    }
  };

  const handleRetryQueue = async () => {
    try {
      const result = await retryEmailQueue();
      setMessage({ type: 'success', text: `Retried: ${result.sent} sent, ${result.failed} failed` });
      await loadAll();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to retry queue' });
    }
  };

  const handleClearQueue = async () => {
    if (!window.confirm('Clear all queued emails?')) return;
    try {
      await clearEmailQueue();
      setMessage({ type: 'success', text: 'Queue cleared' });
      await loadAll();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear queue' });
    }
  };

  const cronPresets = [
    { label: '5:00 PM', value: '0 17 * * *' },
    { label: '6:00 PM', value: '0 18 * * *' },
    { label: '7:00 PM', value: '0 19 * * *' },
    { label: '8:00 PM', value: '0 20 * * *' },
    { label: '9:00 PM', value: '0 21 * * *' },
    { label: '10:00 PM', value: '0 22 * * *' },
  ];

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-lg shadow p-6">
        <div className="text-center py-8 text-text-secondary">Loading scheduler settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Toast */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 font-medium">✕</button>
        </div>
      )}

      {/* Schedule Settings */}
      <div className="bg-surface rounded-lg shadow">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Schedule Settings</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-text">Enable Scheduler</div>
              <div className="text-sm text-text-secondary">Automatically generate daily report PDF</div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-accent' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Schedule Time */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Schedule Time</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {cronPresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setCronTime(preset.value)}
                  className={`px-3 py-1.5 text-sm rounded border min-h-[36px] ${
                    cronTime === preset.value
                      ? 'bg-accent-dim border-accent text-accent'
                      : 'bg-surface border-border text-text-secondary hover:bg-hover'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={cronTime}
              onChange={(e) => setCronTime(e.target.value)}
              placeholder="0 18 * * *"
              className="w-full max-w-xs px-3 py-2 text-sm border border-border rounded focus:ring-1 focus:ring-accent font-mono"
            />
            <div className="text-xs text-gray-400 mt-1">Cron format: minute hour day month weekday</div>
          </div>

          {/* Email Settings */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-text mb-3">Email Settings (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="manager@company.com"
                  className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Sender Email (SMTP From)</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="reports@company.com"
                  className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Configure SMTP in .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
            </div>
          </div>

          {/* Save + Run Now */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-medium text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleRunNow}
              disabled={running}
              className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
            >
              {running ? 'Generating...' : 'Generate Report Now'}
            </button>
          </div>

          {/* Status */}
          {status && (
            <div className="border-t border-gray-100 pt-4 text-sm text-text-secondary space-y-1">
              <div>Status: <span className={`font-medium ${status.isRunning ? 'text-green-600' : 'text-gray-400'}`}>
                {status.isRunning ? 'Running' : 'Stopped'}
              </span></div>
              {status.lastRun && (
                <div>Last run: {new Date(status.lastRun).toLocaleString('en-IN')} 
                  <span className={`ml-2 ${status.lastStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    ({status.lastStatus})
                  </span>
                </div>
              )}
              {status.lastError && (
                <div className="text-red-600 text-xs">Error: {status.lastError}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email Queue */}
      {queue && (
        <div className="bg-surface rounded-lg shadow">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Email Queue</h2>
            <div className="flex gap-2">
              {queue.pending > 0 && (
                <button onClick={handleRetryQueue} className="px-3 py-1.5 text-sm text-accent hover:bg-accent-dim rounded min-h-[36px]">
                  Retry Pending
                </button>
              )}
              {queue.emails.length > 0 && (
                <button onClick={handleClearQueue} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded min-h-[36px]">
                  Clear All
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-amber-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-amber-600">{queue.pending}</div>
                <div className="text-xs text-text-secondary">Pending</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-green-600">{queue.sent}</div>
                <div className="text-xs text-text-secondary">Sent</div>
              </div>
              <div className="bg-red-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-red-600">{queue.failed}</div>
                <div className="text-xs text-text-secondary">Failed</div>
              </div>
            </div>
            {queue.emails.length === 0 ? (
              <div className="text-center py-4 text-text-secondary text-sm">No queued emails</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {queue.emails.slice(0, 20).map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-2 bg-elevated rounded text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text truncate">{email.subject}</div>
                      <div className="text-xs text-text-secondary">To: {email.to}</div>
                    </div>
                    <div className="text-right ml-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        email.status === 'sent' ? 'bg-green-100 text-green-700' :
                        email.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {email.status}
                      </span>
                      {email.retries > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">{email.retries} retries</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generated Reports */}
      <div className="bg-surface rounded-lg shadow">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Generated Reports</h2>
        </div>
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="text-center py-4 text-text-secondary text-sm">No reports generated yet</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {reports.map((report) => (
                <div key={report.filename} className="flex items-center justify-between p-2 bg-elevated rounded text-sm">
                  <div>
                    <div className="font-medium text-text">{report.filename}</div>
                    <div className="text-xs text-text-secondary">
                      {new Date(report.createdAt).toLocaleString('en-IN')} • {formatSize(report.size)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
