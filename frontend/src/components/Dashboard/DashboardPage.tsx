import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardSummary } from '../../api/dashboard';
import type { DashboardSummary } from '../../api/dashboard';
import { StatCards } from './StatCards';
import { LowStockAlert } from './LowStockAlert';
import { RecentActivity } from './RecentActivity';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onViewItem: (itemId: number) => void;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="skeleton h-8 w-40 mb-2" />
            <div className="skeleton h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-10 w-24 rounded-lg" />
            <div className="skeleton h-10 w-20 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <div className="skeleton h-96 rounded-xl" />
          </div>
          <div className="lg:col-span-2">
            <div className="skeleton h-96 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage({ onNavigate, onViewItem }: DashboardPageProps) {
  const { canDoStockOps } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center glass border border-border rounded-2xl p-8 max-w-sm"
        >
          <div className="text-danger mb-3 text-lg font-medium">{error}</div>
          <button onClick={loadSummary} className="px-4 py-2 text-sm font-semibold text-base bg-gradient-to-r from-accent to-accent-press rounded-xl hover:shadow-lg hover:shadow-accent/20 transition-all">
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">Inventory overview & recent activity</p>
          </div>
          {canDoStockOps && (
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('stock-in')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-ok/15 text-ok border border-ok/20 hover:bg-ok/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m-6-6h12" />
                </svg>
                Stock In
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('stock-out')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-danger/15 text-danger border border-danger/20 hover:bg-danger/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                </svg>
                Issue
              </motion.button>
            </div>
          )}
        </div>

        {/* Stat Cards */}
        <StatCards
          totalActiveItems={summary.totalActiveItems}
          lowStockCount={summary.lowStockCount}
          outOfStockCount={summary.outOfStockCount}
          totalStockValue={summary.totalStockValue}
          todayInCount={summary.todayInCount}
          todayInTotalQty={summary.todayInTotalQty}
          todayOutCount={summary.todayOutCount}
          todayOutTotalQty={summary.todayOutTotalQty}
          onNavigate={onNavigate}
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <RecentActivity transactions={summary.lastTransactions} onNavigate={onNavigate} />
          </div>
          <div className="lg:col-span-2">
            <LowStockAlert items={summary.lowStockItems} onViewItem={onViewItem} />
          </div>
        </div>
      </div>
    </div>
  );
}
