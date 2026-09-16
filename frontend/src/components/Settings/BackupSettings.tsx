// BackupSettings Component
// Shows backup section with "Backup Now" button, restore, and list of available backups

import { useState, useEffect } from 'react';
import { createBackup, listBackups, getDownloadUrl, restoreBackup } from '../../api/backup';
import type { BackupInfo } from '../../api/backup';

export function BackupSettings() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Restore state
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBackups();
      setBackups(data.backups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createBackup();
      setSuccess(result.message);
      await loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget || confirmText !== 'RESTORE') return;
    setRestoring(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await restoreBackup(restoreTarget);
      setSuccess(result.message);
      setRestoreTarget(null);
      setConfirmText('');
      // Reload page after short delay to reflect new data
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
      setRestoreTarget(null);
      setConfirmText('');
    } finally {
      setRestoring(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-surface rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-medium text-text">Backup</h2>
        <p className="text-sm text-text-secondary mt-1">
          Automatic backups run every 24 hours. Monthly backups are kept permanently.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-100 text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Backup Now Button */}
      <div className="px-4 py-4 border-b border-border">
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {creating ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Backup...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Backup Now
            </>
          )}
        </button>
      </div>

      {/* Backup List */}
      <div className="px-4 py-3">
        <h3 className="text-sm font-medium text-text mb-3">
          Available Backups ({backups.length})
        </h3>

        {loading ? (
          <div className="text-center py-4 text-text-secondary">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="text-center py-4 text-text-secondary">No backups available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-secondary border-b border-border">
                  <th className="pb-2 font-medium">Filename</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {backups.map((backup) => (
                  <tr key={backup.filename} className="hover:bg-hover">
                    <td className="py-2 font-mono text-xs text-text">
                      {backup.filename}
                    </td>
                    <td className="py-2 text-text-secondary">
                      {formatDate(backup.createdAt)}
                    </td>
                    <td className="py-2 text-text-secondary">
                      {formatSize(backup.size)}
                    </td>
                    <td className="py-2">
                      {backup.isMonthly ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                          Monthly
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-base text-text-secondary rounded">
                          Daily
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => { setRestoreTarget(backup.filename); setConfirmText(''); }}
                          className="text-low hover:text-orange-700 text-xs font-medium"
                        >
                          Restore
                        </button>
                        <a
                          href={getDownloadUrl(backup.filename)}
                          className="text-accent hover:text-accent-text text-xs font-medium"
                          download
                        >
                          Download
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-elevated border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-low/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-text font-semibold">Restore Backup</h3>
                <p className="text-text-secondary text-xs">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-base rounded-lg border border-border">
              <p className="text-text-secondary text-sm mb-1">Restoring from:</p>
              <p className="text-text font-mono text-sm">{restoreTarget}</p>
            </div>

            <div className="mb-4 p-3 bg-low/5 border border-low/20 rounded-lg">
              <p className="text-text-secondary text-xs leading-relaxed">
                This will <span className="font-semibold text-text">replace all current data</span> with this backup.
                A safety backup of the current data will be created automatically before restoring.
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-text-secondary text-xs mb-1.5">
                Type <span className="font-mono font-semibold text-text">RESTORE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
                autoFocus
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-text text-sm placeholder:text-text-muted outline-none focus:border-low focus:ring-1 focus:ring-low/30"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setRestoreTarget(null); setConfirmText(''); }}
                disabled={restoring}
                className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary bg-base border border-border rounded-lg hover:bg-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring || confirmText !== 'RESTORE'}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-low rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {restoring ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Restoring...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
