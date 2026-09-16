import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Transaction } from '../../types';
import { listTransactions } from '../../api/transactions';
import { StockOutForm } from './StockOutForm';

export function StockOutPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listTransactions({ page: 1, limit: 10, txn_type: 'OUT' })
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
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-11 h-11 rounded-xl bg-danger/10 flex items-center justify-center shadow-lg shadow-danger/10">
            <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text tracking-tight">Stock Issue</h1>
            <p className="text-sm text-text-secondary">Issue inventory to personnel, departments or machines</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <StockOutForm onSaved={handleSaved} />
          </div>

          {/* Recent Transactions Sidebar */}
          <div className="glass rounded-2xl border border-border-light overflow-hidden order-first lg:order-last">
            <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-danger-dim flex items-center justify-center">
                  <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">Recent Issues</h3>
              </div>
              {!loading && recentTransactions.length > 0 && (
                <span className="text-[10px] text-text-muted bg-elevated px-2.5 py-1 rounded-full font-medium">{recentTransactions.length}</span>
              )}
            </div>

            <div className="p-3">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-xl" />
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm font-medium">No recent issues</p>
                  <p className="text-text-muted text-xs mt-1">Saved issues will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((txn, idx) => (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.25 }}
                      className="glass rounded-xl p-3.5 hover:bg-hover transition-colors group cursor-default"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-danger" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm text-accent font-medium group-hover:text-accent transition-colors truncate">
                              {txn.txn_no}
                            </span>
                            <span className="text-[10px] text-text-muted tabular-nums flex-shrink-0">
                              {new Date(txn.txn_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                            <span>{txn.person?.name || 'No person'}</span>
                            {txn.department && (
                              <>
                                <span className="text-text-muted">·</span>
                                <span className="text-text-muted">{txn.department.name}</span>
                              </>
                            )}
                          </div>
                          {txn.purpose && (
                            <div className="text-[11px] text-text-muted mt-0.5 truncate">{txn.purpose}</div>
                          )}
                        </div>
                      </div>
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
