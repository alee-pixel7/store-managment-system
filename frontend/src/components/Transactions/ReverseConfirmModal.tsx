// ReverseConfirmModal Component
// Confirmation dialog for reversing a transaction

import { useState } from 'react';
import type { Transaction } from '../../types';

interface ReverseConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  transaction: Transaction | null;
}

export function ReverseConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  transaction,
}: ReverseConfirmModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reverse transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-surface rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Reverse Transaction</h3>
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-text-secondary"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Transaction Info */}
          <div className="mb-4 p-3 bg-elevated rounded">
            <div className="text-sm">
              <div className="font-medium text-text">{transaction.txn_no}</div>
              <div className="text-text-secondary">
                {new Date(transaction.txn_date).toLocaleDateString('en-IN')} •{' '}
                {transaction.txn_type}
              </div>
              {transaction.transaction_items && (
                <div className="mt-1 text-text-secondary">
                  {transaction.transaction_items.length} item(s) •{' '}
                  {transaction.transaction_items.reduce((sum, i) => sum + i.quantity, 0)} total qty
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 text-lg">⚠</span>
              <div className="text-sm text-amber-800">
                <div className="font-medium">This will create a reversal transaction.</div>
                <div className="mt-1">
                  The original transaction will be marked as reversed and stock will be
                  adjusted accordingly. This action cannot be undone.
                </div>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text mb-1">
              Reason for reversal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for reversal..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent"
              autoFocus
            />
            {error && <div className="mt-1 text-sm text-red-600">{error}</div>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-text bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Reversing...' : 'Reverse Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
