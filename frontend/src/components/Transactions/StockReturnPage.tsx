import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Transaction } from '../../types';
import { listTransactions } from '../../api/transactions';
import { formatDateShort } from '../../lib/dates';
import { StockReturnForm } from './StockReturnForm';

export function StockReturnPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listTransactions({ page: 1, limit: 10, txn_type: 'RETURN' })
      .then((result) => {
        setRecentTransactions(result.items);
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

          {/* Premium Sidebar */}
          <div className="card overflow-hidden order-first lg:order-last">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border-light flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-low/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider flex-1">Recent Returns</h3>
              <span className="text-[10px] font-bold text-low bg-low/10 px-2 py-0.5 rounded-full">
                {recentTransactions.length}
              </span>
            </div>

            {/* Sidebar Content */}
            <div className="p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton rounded-xl h-20" />
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-secondary">No recent returns</p>
                  <p className="text-xs text-text-muted mt-0.5">Returns will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((txn, idx) => (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.2 }}
                      className="card p-3 hover:border-low/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-low" />
                          <span className="font-mono text-sm text-low font-medium">
                            {txn.txn_no}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-muted">
                          {formatDateShort(txn.txn_date)}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary">
                        {txn.supplier?.name || txn.person?.name || 'No person'}
                      </div>
                      {txn.remarks && (
                        <div className="text-[10px] text-text-muted mt-1 truncate">{txn.remarks}</div>
                      )}
                    </motion.div>
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
