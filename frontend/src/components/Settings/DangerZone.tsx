// DangerZone Component — factory reset for handing the install to a new customer

import { useState } from 'react';
import { factoryReset } from '../../api/admin';

export function DangerZone() {
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const open = () => {
    setConfirmText('');
    setError('');
    setShowModal(true);
  };

  const handleReset = async () => {
    if (confirmText !== 'RESET') return;
    setBusy(true);
    setError('');
    try {
      const result = await factoryReset(confirmText);
      setShowModal(false);
      alert(`${result.message}\n\n(${result.backupsCleared} backup + ${result.reportsCleared} report files removed)`);
      localStorage.removeItem('store_auth_token');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mt-6 border border-danger/30 rounded-2xl p-5 bg-danger-dim">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-danger">⚠ Danger Zone</h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Erase ALL data — stock, items, transactions, departments, machines, users, backups. For handing this install to a new customer.
            </p>
          </div>
          <button type="button" onClick={open} className="btn btn-danger btn-sm">
            Reset All Data…
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card-elevated rounded-2xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-danger">Factory Reset</h3>
                <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-text text-xl">×</button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 rounded-xl border border-danger/20 bg-danger-dim text-sm text-text space-y-1">
                <p>This permanently deletes:</p>
                <ul className="list-disc pl-5 text-text-secondary">
                  <li>All stock, items &amp; transactions</li>
                  <li>Departments, machines, persons, suppliers</li>
                  <li>All user accounts (only STORE ADMIN remains)</li>
                  <li>All backup files &amp; reports</li>
                </ul>
                <p className="pt-1">
                  Fresh start — login: <span className="font-mono font-semibold">STORE ADMIN / S123T</span>
                </p>
              </div>
              {error && (
                <div className="p-2 bg-danger-dim text-danger text-sm rounded border border-danger/20">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-text mb-1">Type RESET to confirm *</label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESET"
                  className="input w-full text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button
                onClick={handleReset}
                disabled={confirmText !== 'RESET' || busy}
                className="btn btn-danger btn-sm"
              >
                {busy ? 'Resetting...' : 'Erase Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
