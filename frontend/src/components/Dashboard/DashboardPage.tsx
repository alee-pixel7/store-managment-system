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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDashboardDate() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { dateStr, timeStr };
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="skeleton h-10 w-64 mb-2" />
            <div className="skeleton h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-12 w-28 rounded-xl" />
            <div className="skeleton h-12 w-24 rounded-xl" />
          </div>
        </div>
        <div className="skeleton h-14 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
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
  const { user, canDoStockOps } = useAuth();
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
          className="text-center card p-8 max-w-sm"
        >
          <div className="text-danger mb-3 text-lg font-medium">{error}</div>
          <button onClick={loadSummary} className="btn btn-primary btn-md">
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!summary) return null;

  const { dateStr, timeStr } = formatDashboardDate();
  const firstName = user?.full_name?.split(' ')[0] || 'Admin';

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-text tracking-tight">
              {getGreeting()}, <span className="text-gradient-gold">{firstName}</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>{dateStr}</span>
              <span className="text-text-muted">·</span>
              <span>{timeStr}</span>
            </p>
          </div>
          {canDoStockOps && (
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('stock-in')}
                className="flex items-center gap-2.5 px-5 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-ok/20 to-ok/10 text-ok border border-ok/25 hover:from-ok/30 hover:to-ok/15 hover:shadow-lg hover:shadow-ok/10 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
                </svg>
                Stock In
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('stock-out')}
                className="flex items-center gap-2.5 px-5 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-danger/20 to-danger/10 text-danger border border-danger/25 hover:from-danger/30 hover:to-danger/15 hover:shadow-lg hover:shadow-danger/10 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
                Issue
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Quick Summary Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card card-accent-top p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-text-secondary">Quick Overview</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <span className="text-text-secondary">
                📦 <b className="text-text font-semibold">{summary.totalActiveItems.toLocaleString()}</b> total
              </span>
              <span className="text-ok">
                ✅ <b className="font-semibold">{(summary.totalActiveItems - summary.outOfStockCount).toLocaleString()}</b> in stock
              </span>
              {summary.lowStockCount > 0 && (
                <span className="text-low">
                  ⚠️ <b className="font-semibold">{summary.lowStockCount}</b> low
                </span>
              )}
              <span className="text-danger">
                ❌ <b className="font-semibold">{summary.outOfStockCount.toLocaleString()}</b> out
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Stat Cards */}
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
