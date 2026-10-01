// ItemDetailPage Component
// Shows item info card and ledger with running balance

import { useState, useEffect, useCallback } from 'react';
import type { ItemDetail, LedgerEntry } from '../../types';
import { getItemLedger } from '../../api/items';
import { downloadExport } from '../../api/export';
import { Dropdown } from '../ui/Dropdown';
import { DateField } from '../ui/DateField';
import { ItemLedger } from './ItemLedger';

interface ItemDetailPageProps {
  itemId: number;
  onBack: () => void;
}

export function ItemDetailPage({ itemId, onBack }: ItemDetailPageProps) {
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  // Filter state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Fetch item ledger
  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getItemLedger(itemId, {
        from: fromDate || undefined,
        to: toDate || undefined,
        type: typeFilter || undefined,
      });
      setItem(result.item);
      setLedger(result.ledger);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [itemId, fromDate, toDate, typeFilter]);

  useEffect(() => {
    fetchLedger();
  }, [itemId, fromDate, toDate, typeFilter]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      await downloadExport('ledger', { itemId: String(itemId) }, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (loading && !item) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-text-secondary">Loading item details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={onBack}
            className="btn btn-ghost btn-md"
          >
            ← Back to Items
          </button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-surface/80 backdrop-blur-xl border-b border-border-light px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="btn btn-ghost btn-md min-h-[44px]"
            >
              ← Back
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-text">Item Details</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting === 'excel'}
              className="btn btn-sm text-ok bg-ok-dim border border-ok/20 hover:bg-ok/20 disabled:opacity-50 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">{exporting === 'excel' ? 'Exporting...' : 'Excel'}</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting === 'pdf'}
              className="btn btn-sm text-danger bg-danger-dim border border-danger/20 hover:bg-danger/20 disabled:opacity-50 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{exporting === 'pdf' ? 'Exporting...' : 'PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-4">
        {/* Item Info Card */}
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Code */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Code</div>
              <div className="text-sm font-mono font-medium text-text">{item.item_code}</div>
            </div>
            {/* Name */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Name</div>
              <div className="text-sm font-medium text-text">{item.item_name}</div>
            </div>
            {/* Brand */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Brand</div>
              <div className="text-sm text-text">{item.brand || '-'}</div>
            </div>
            {/* Spec / Value */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Spec / Value</div>
              <div className="sm:col-span-1 text-sm text-text font-mono">{item.spec || '-'}</div>
            </div>
            {/* Category */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Category</div>
              <div className="text-sm text-text">{item.category?.name || '-'}</div>
            </div>
            {/* Unit */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Unit</div>
              <div className="text-sm text-text">{item.unit}</div>
            </div>
            {/* Rack Location */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Rack Location</div>
              <div className="text-sm text-text">{item.rack_location || '-'}</div>
            </div>
            {/* Current Stock */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Current Stock</div>
              <div className={`text-sm font-semibold ${
                item.current_stock <= 0
                  ? 'text-red-600'
                  : item.current_stock <= item.min_stock
                  ? 'text-amber-600'
                  : 'text-green-600'
              }`}>
                {item.current_stock} {item.unit}
              </div>
            </div>
            {/* Min Stock */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Min Stock</div>
              <div className="text-sm text-text">{item.min_stock} {item.unit}</div>
            </div>
            {/* Last Rate */}
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Last Rate</div>
              <div className="text-sm text-text">
                {item.last_rate != null ? `₹${item.last_rate.toFixed(2)}` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Filters */}
        <div className="card p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="text-sm font-medium text-text">Filters:</div>
            {/* From Date */}
            <div className="flex-1 sm:flex-initial">
              <label className="text-xs text-text-secondary block sm:hidden">From</label>
              <DateField
                value={fromDate}
                onChange={setFromDate}
                className="w-full [&_input]:px-2 [&_input]:py-1 [&_input]:text-sm [&_input]:border [&_input]:border-border [&_input]:rounded [&_input]:min-h-[44px] sm:[&_input]:min-h-0"
              />
            </div>
            {/* To Date */}
            <div className="flex-1 sm:flex-initial">
              <label className="text-xs text-text-secondary block sm:hidden">To</label>
              <DateField
                value={toDate}
                onChange={setToDate}
                className="w-full [&_input]:px-2 [&_input]:py-1 [&_input]:text-sm [&_input]:border [&_input]:border-border [&_input]:rounded [&_input]:min-h-[44px] sm:[&_input]:min-h-0"
              />
            </div>
            {/* Type Filter */}
            <div className="flex-1 sm:flex-initial">
              <label className="text-xs text-text-secondary block sm:hidden">Type</label>
              <Dropdown
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'IN', label: 'Stock In' },
                  { value: 'OUT', label: 'Stock Out' },
                  { value: 'RETURN', label: 'Return' },
                  { value: 'ADJUST', label: 'Adjustment' },
                  { value: 'REVERSAL', label: 'Reversal' },
                ]}
                value={typeFilter}
                onChange={(v) => setTypeFilter(String(v))}
                className="w-full sm:w-40"
              />
            </div>
            {/* Clear Filters */}
            {(fromDate || toDate || typeFilter) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setTypeFilter('');
                }}
                className="px-3 py-2 sm:py-1 text-sm text-text-secondary hover:text-text min-h-[44px] sm:min-h-0"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        <ItemLedger ledger={ledger} loading={loading} unit={item.unit} onReversed={fetchLedger} />
      </div>
    </div>
  );
}
