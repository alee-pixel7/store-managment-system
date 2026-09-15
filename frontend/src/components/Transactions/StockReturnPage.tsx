// StockReturnPage Component
// Main page for stock return transactions

import { useState, useEffect } from 'react';
import type { Transaction } from '../../types';
import { listTransactions } from '../../api/transactions';
import { StockReturnForm } from './StockReturnForm';

export function StockReturnPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listTransactions({ page: 1, limit: 10, txn_type: 'RETURN' })
      .then((result) => {
        setRecentTransactions(result.transactions);
      })
      .catch((error) => {
        console.error('Failed to fetch transactions:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshKey]);

  const handleSaved = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <StockReturnForm onSaved={handleSaved} />
          </div>

          <div className="bg-surface rounded-lg shadow order-first lg:order-last">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Recent Returns</h3>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="text-center py-4 text-text-secondary text-sm">Loading...</div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-4 text-text-secondary text-sm">No recent returns</div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="p-3 bg-elevated rounded border border-border hover:bg-hover"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm text-accent font-medium">
                          {txn.txn_no}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {new Date(txn.txn_date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div className="text-sm text-text-secondary">
                        {txn.supplier?.name || 'No supplier'}
                      </div>
                      {txn.remarks && (
                        <div className="text-xs text-text-secondary mt-1">{txn.remarks}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
