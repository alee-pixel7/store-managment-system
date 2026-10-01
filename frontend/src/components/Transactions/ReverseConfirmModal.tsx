// ReverseConfirmModal Component
// Confirmation dialog for reversing a transaction

import { useState } from 'react';
import type { Transaction } from '../../types';
import { formatDate } from '../../lib/dates';

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative card-elevated rounded-2xl w-full max-w-md mx-4">
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
                {formatDate(transaction.txn_date)} •{' '}
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
              className="input w-full text-sm"
              autoFocus
            />
            {error && <div className="mt-1 text-sm text-red-600">{error}</div>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="btn btn-danger btn-md"
            >
              {loading ? 'Reversing...' : 'Reverse Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
