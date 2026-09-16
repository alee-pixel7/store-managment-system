import { useState, useEffect } from 'react';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center bg-surface border border-border rounded-xl p-8 max-w-sm">
          <div className="text-danger mb-3 text-lg font-medium">{error}</div>
          <button onClick={loadSummary} className="px-4 py-2 text-sm font-medium text-base bg-accent rounded-lg hover:bg-accent-hover transition-colors">
            Retry
          </button>
        </div>
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
            <h1 className="text-2xl font-bold text-text tracking-tight">Dashboard</h1>
            <p className="text-sm text-text-secondary mt-0.5">Inventory overview & recent activity</p>
          </div>
          {canDoStockOps && (
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate('stock-in')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-ok/15 text-ok border border-ok/20 hover:bg-ok/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m-6-6h12" />
                </svg>
                Stock In
              </button>
              <button
                onClick={() => onNavigate('stock-out')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-danger/15 text-danger border border-danger/20 hover:bg-danger/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                </svg>
                Issue
              </button>
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
