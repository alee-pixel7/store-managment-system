import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Transaction } from '../../types';
import { listTransactions } from '../../api/transactions';
import { formatDateShort } from '../../lib/dates';
import { StockInForm } from './StockInForm';

export function StockInPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listTransactions({ page: 1, limit: 10, txn_type: 'IN,ADJUST' })
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
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-11 h-11 rounded-xl bg-ok/10 flex items-center justify-center shadow-lg shadow-ok/10">
            <svg className="w-6 h-6 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text tracking-tight">Stock In</h1>
            <p className="text-sm text-text-secondary">Record incoming inventory with supplier details</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <StockInForm onSaved={handleSaved} />
          </div>

          {/* Recent Transactions Sidebar */}
          <div className="card overflow-hidden order-first lg:order-last">
            <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-dim flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">Recent Stock In</h3>
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm font-medium">No recent transactions</p>
                  <p className="text-text-muted text-xs mt-1">Saved stock ins will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((txn, idx) => {
                    const isAdjust = txn.txn_type === 'ADJUST';
                    return (
                      <motion.div
                        key={txn.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.25 }}
                        className="card p-3.5 hover:bg-hover transition-colors group cursor-default"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isAdjust ? 'bg-accent' : 'bg-ok'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-sm text-accent font-medium group-hover:text-accent transition-colors truncate">
                                {txn.txn_no}
                              </span>
                              <span className="text-[10px] text-text-muted tabular-nums flex-shrink-0">
                                {formatDateShort(txn.txn_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                              <span>{txn.supplier?.name || 'No supplier'}</span>
                              {txn.invoice_no && (
                                <>
                                  <span className="text-text-muted">·</span>
                                  <span className="text-text-muted">Inv: {txn.invoice_no}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
