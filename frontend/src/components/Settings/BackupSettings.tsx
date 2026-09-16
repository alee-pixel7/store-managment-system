// BackupSettings Component — Premium dark industrial design

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBackup, listBackups, getDownloadUrl, restoreBackup } from '../../api/backup';
import type { BackupInfo } from '../../api/backup';

export function BackupSettings() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

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
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className="flex items-center gap-2.5 px-4 py-3 glass rounded-xl border border-danger/20 shadow-lg shadow-danger/5 min-w-[280px]"
            >
              <svg className="w-4 h-4 text-danger flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-danger">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className="flex items-center gap-2.5 px-4 py-3 glass rounded-xl border border-ok/20 shadow-lg shadow-ok/5 min-w-[280px]"
            >
              <svg className="w-4 h-4 text-ok flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-ok">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-2xl border border-border-light overflow-hidden"
      >
        {/* Card Header */}
        <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">Backup</h3>
              <p className="text-[11px] text-text-muted mt-0.5">Automatic backups run every 24 hours</p>
            </div>
          </div>
          <motion.button
            onClick={handleCreateBackup}
            disabled={creating}
            whileTap={{ scale: 0.97 }}
            className="relative overflow-hidden bg-gradient-to-r from-accent to-accent-press hover:from-accent-hover hover:to-accent text-base font-semibold text-sm px-4 py-2 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/15 hover:shadow-accent/25 flex items-center gap-2 group"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            {creating ? (
              <>
                <svg className="animate-spin h-4 w-4 relative" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="relative">Creating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
                </svg>
                <span className="relative">Backup Now</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Backup List */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">
              Available Backups
            </h3>
            {!loading && (
              <span className="text-[10px] text-text-muted bg-elevated px-2.5 py-1 rounded-full font-medium">
                {backups.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm">No backups available</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 pl-3 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em]">Filename</th>
                    <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em]">Date</th>
                    <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em]">Size</th>
                    <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em]">Type</th>
                    <th className="pb-2 pr-3 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup, i) => (
                    <motion.tr
                      key={backup.filename}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="border-t border-border-light hover:bg-hover/50 transition-colors group"
                    >
                      <td className="py-2.5 pl-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${backup.isMonthly ? 'bg-purple-500' : 'bg-accent/40'}`} />
                          <span className="font-mono text-xs text-text">{backup.filename}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-text-secondary text-xs">
                        {formatDate(backup.createdAt)}
                      </td>
                      <td className="py-2.5 text-text-secondary text-xs">
                        {formatSize(backup.size)}
                      </td>
                      <td className="py-2.5">
                        {backup.isMonthly ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                            Monthly
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-elevated text-text-muted rounded-full">
                            Daily
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setRestoreTarget(backup.filename); setConfirmText(''); }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-low hover:bg-low/10 transition-all"
                            title="Restore"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                            </svg>
                          </button>
                          <a
                            href={getDownloadUrl(backup.filename)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-all"
                            title="Download"
                            download
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                          </a>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {restoreTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { if (!restoring) { setRestoreTarget(null); setConfirmText(''); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass rounded-2xl border border-border-light shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-low/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-text font-semibold">Restore Backup</h3>
                    <p className="text-text-secondary text-xs">This action cannot be undone</p>
                  </div>
                </div>

                <div className="p-3 bg-base/50 rounded-xl border border-border-light mb-3">
                  <p className="text-text-muted text-[11px] uppercase tracking-wider mb-1">Restoring from</p>
                  <p className="text-text font-mono text-sm">{restoreTarget}</p>
                </div>

                <div className="p-3 bg-low/5 border border-low/15 rounded-xl">
                  <p className="text-text-secondary text-xs leading-relaxed">
                    This will <span className="font-semibold text-text">replace all current data</span> with this backup.
                    A safety backup will be created automatically.
                  </p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 pb-6">
                <div className="mb-5">
                  <label className="block text-text-muted text-[11px] uppercase tracking-wider mb-1.5">
                    Type <span className="font-mono font-semibold text-text">RESTORE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="RESTORE"
                    autoFocus
                    className="w-full bg-base border border-border-light rounded-xl px-4 py-2.5 text-text text-sm placeholder:text-text-muted outline-none focus:border-low/50 focus:ring-2 focus:ring-low/10 transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setRestoreTarget(null); setConfirmText(''); }}
                    disabled={restoring}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary bg-base border border-border-light rounded-xl hover:bg-hover transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleRestore}
                    disabled={restoring || confirmText !== 'RESTORE'}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 relative overflow-hidden px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-low to-orange-600 rounded-xl hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-low/15 group"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                    {restoring ? (
                      <>
                        <svg className="animate-spin h-4 w-4 relative" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="relative">Restoring...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                        <span className="relative">Restore</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
