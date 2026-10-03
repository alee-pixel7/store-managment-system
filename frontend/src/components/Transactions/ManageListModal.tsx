// ManageListModal
// Shared "delete entries" modal for the quick-select "+" dropdowns

import { useState } from 'react';

export interface ManageEntry {
  id: number;
  label: string;
}

interface ManageListModalProps {
  title: string;
  items: ManageEntry[];
  onDelete: (item: ManageEntry) => Promise<void>;
  onClose: () => void;
  emptyText?: string;
}

export function ManageListModal({
  title,
  items,
  onDelete,
  onClose,
  emptyText = 'No entries yet',
}: ManageListModalProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleDelete = async (item: ManageEntry) => {
    if (!window.confirm(`Delete "${item.label}"?`)) return;
    setBusyId(item.id);
    setError('');
    try {
      await onDelete(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card-elevated rounded-2xl w-full max-w-sm">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-text-secondary hover:text-text text-xl">×</button>
          </div>
        </div>
        <div className="p-4">
          {error && (
            <div className="mb-3 p-2 bg-danger-dim text-danger text-sm rounded border border-danger/20">{error}</div>
          )}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {items.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-3">{emptyText}</p>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="text-sm text-text truncate">{item.label}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={busyId !== null}
                  className="btn btn-sm text-danger bg-danger-dim border border-danger/20 hover:bg-danger/20 disabled:opacity-50 px-2"
                >
                  {busyId === item.id ? '...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn btn-ghost btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
