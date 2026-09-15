// ItemLedger Component
// Displays the ledger table for an item with running balance

import { useState } from 'react';
import type { LedgerEntry, Transaction } from '../../types';
import { reverseTransaction } from '../../api/transactions';
import { ReverseConfirmModal } from '../Transactions/ReverseConfirmModal';
import { useAuth } from '../../contexts/AuthContext';

interface ItemLedgerProps {
  ledger: LedgerEntry[];
  loading: boolean;
  unit: string;
  onReversed?: () => void;
}

export function ItemLedger({ ledger, loading, unit, onReversed }: ItemLedgerProps) {
  const { canReverse } = useAuth();
  const [reverseModal, setReverseModal] = useState<{
    isOpen: boolean;
    transaction: Transaction | null;
  }>({ isOpen: false, transaction: null });

  if (loading) {
    return (
      <div className="bg-surface rounded-lg shadow p-8 text-center text-text-secondary">
        Loading ledger...
      </div>
    );
  }

  if (ledger.length === 0) {
    return (
      <div className="bg-surface rounded-lg shadow p-8 text-center text-text-secondary">
        No transactions found for this item.
      </div>
    );
  }

  const getTxnTypeBadge = (type: string) => {
    const base = 'px-2 py-0.5 text-xs font-medium rounded';
    switch (type) {
      case 'IN':
        return <span className={`${base} bg-green-100 text-green-700`}>IN</span>;
      case 'OUT':
        return <span className={`${base} bg-red-100 text-red-700`}>OUT</span>;
      case 'RETURN':
        return <span className={`${base} bg-accent-dim text-accent`}>RETURN</span>;
      case 'ADJUST':
        return <span className={`${base} bg-purple-100 text-purple-700`}>ADJUST</span>;
      case 'REVERSAL':
        return <span className={`${base} bg-orange-100 text-orange-700`}>REVERSAL</span>;
      default:
        return <span className={`${base} bg-base text-text`}>{type}</span>;
    }
  };

  const handleReverseClick = (entry: LedgerEntry) => {
    // Build a Transaction object from LedgerEntry for the modal
    const txn: Transaction = {
      id: entry.id,
      txn_no: entry.txn_no,
      txn_type: entry.txn_type,
      txn_date: entry.date,
      supplier_id: null,
      invoice_no: null,
      department_id: null,
      machine_id: null,
      person_id: null,
      purpose: entry.purpose,
      remarks: entry.remarks,
      reverses_txn_id: null,
      is_reversed: entry.is_reversed,
      created_by: 1,
      created_at: entry.date,
      items: [],
      supplier: null,
      person: null,
      department: null,
      machine: null,
    };
    setReverseModal({ isOpen: true, transaction: txn });
  };

  const handleReverseConfirm = async (reason: string) => {
    if (!reverseModal.transaction) return;
    await reverseTransaction(reverseModal.transaction.id, reason);
    setReverseModal({ isOpen: false, transaction: null });
    onReversed?.();
  };

  return (
    <>
      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-elevated">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Txn No
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  In Qty
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Out Qty
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Party
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Purpose
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Entered By
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-gray-200">
              {ledger.map((entry) => (
                <tr
                  key={entry.id}
                  className={`${
                    entry.is_reversed
                      ? 'bg-elevated line-through text-gray-400'
                      : 'hover:bg-hover'
                  }`}
                >
                  <td className="px-3 py-2 text-sm text-text whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-3 py-2 text-sm text-text whitespace-nowrap">
                    {entry.txn_no}
                  </td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {getTxnTypeBadge(entry.txn_type)}
                      {entry.is_reversed && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-200 text-red-800 rounded">
                          REVERSED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-green-600 whitespace-nowrap">
                    {entry.in_qty != null ? `${entry.in_qty} ${unit}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-red-600 whitespace-nowrap">
                    {entry.out_qty != null ? `${entry.out_qty} ${unit}` : '-'}
                  </td>
                  <td className={`px-3 py-2 text-sm text-right font-medium whitespace-nowrap ${
                    entry.running_balance < 0
                      ? 'text-red-600'
                      : entry.running_balance === 0
                      ? 'text-text-secondary'
                      : 'text-text'
                  }`}>
                    {entry.running_balance} {unit}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-text whitespace-nowrap">
                    {entry.rate != null ? `₹${entry.rate.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-text whitespace-nowrap">
                    {entry.party || '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-text max-w-[200px] truncate" title={entry.purpose || ''}>
                    {entry.purpose || '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-text whitespace-nowrap">
                    {entry.created_by}
                  </td>
                  <td className="px-3 py-2 text-sm text-center whitespace-nowrap">
                    {canReverse && !entry.is_reversed && entry.txn_type !== 'REVERSAL' && (
                      <button
                        onClick={() => handleReverseClick(entry)}
                        className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 rounded"
                        title="Reverse this transaction"
                      >
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="border-t border-border px-4 py-2 bg-elevated text-sm text-text-secondary">
          Total: {ledger.length} transactions
        </div>
      </div>

      {/* Reverse Modal */}
      <ReverseConfirmModal
        isOpen={reverseModal.isOpen}
        onClose={() => setReverseModal({ isOpen: false, transaction: null })}
        onConfirm={handleReverseConfirm}
        transaction={reverseModal.transaction}
      />
    </>
  );
}
