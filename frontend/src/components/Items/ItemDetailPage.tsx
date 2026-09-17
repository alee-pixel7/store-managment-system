// ItemDetailPage Component
// Shows item info card and ledger with running balance

import { useState, useEffect, useCallback } from 'react';
import type { ItemDetail, LedgerEntry } from '../../types';
import { getItemLedger } from '../../api/items';
import { downloadExport } from '../../api/export';
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
            className="px-4 py-2 text-sm font-medium text-text bg-elevated border border-border rounded hover:bg-hover"
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
      <div className="bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-3 py-2 text-sm font-medium text-text bg-elevated border border-border rounded hover:bg-hover min-h-[44px]"
            >
              ← Back
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-text">Item Details</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting === 'excel'}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">{exporting === 'excel' ? 'Exporting...' : 'Excel'}</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting === 'pdf'}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
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
        <div className="bg-surface rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Code */}
            <div>
              <div className="text-xs text-text-secondary uppercase">Code</div>
              <div className="text-sm font-mono font-medium text-text">{item.item_code}</div>
            </div>
            {/* Name */}
            <div>
              <div className="text-xs text-text-secondary uppercase">Name</div>
              <div className="text-sm font-medium text-text">{item.item_name}</div>
            </div>
            {/* Brand */}
            <div>
              <div className="text-xs text-text-secondary uppercase">Brand</div>
              <div className="text-sm text-text">{item.brand || '-'}</div>
            </div>
            {/* Unit */}
            <div>
              <div className="text-xs text-text-secondary uppercase">Unit</div>
              <div className="text-sm text-text">{item.unit}</div>
            </div>
            {/* Rack Location */}
            <div>
              <div className="text-xs text-text-secondary uppercase">Rack Location</div>
              <div className="text-sm text-text">{item.rack_location || '-'}</div>
            </div>
            {/* Current Stock */}
            <div>
              <div className="text-xs text-text-secondary uppercase">Current Stock</div>
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
              <div className="text-xs text-text-secondary uppercase">Min Stock</div>
              <div className="text-sm text-text">{item.min_stock} {item.unit}</div>
            </div>
            {/* Last Rate */}
            <div>
              <div className="text-xs text-text-secondary uppercase">Last Rate</div>
              <div className="text-sm text-text">
                {item.last_rate != null ? `₹${item.last_rate.toFixed(2)}` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Filters */}
        <div className="bg-surface rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="text-sm font-medium text-text">Filters:</div>
            {/* From Date */}
            <div className="flex-1 sm:flex-initial">
              <label className="text-xs text-text-secondary block sm:hidden">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2 py-2 sm:py-1 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent min-h-[44px] sm:min-h-0"
              />
            </div>
            {/* To Date */}
            <div className="flex-1 sm:flex-initial">
              <label className="text-xs text-text-secondary block sm:hidden">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2 py-2 sm:py-1 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent min-h-[44px] sm:min-h-0"
              />
            </div>
            {/* Type Filter */}
            <div className="flex-1 sm:flex-initial">
              <label className="text-xs text-text-secondary block sm:hidden">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-2 py-2 sm:py-1 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent min-h-[44px] sm:min-h-0"
              >
                <option value="">All Types</option>
                <option value="IN">Stock In</option>
                <option value="OUT">Stock Out</option>
                <option value="RETURN">Return</option>
                <option value="ADJUST">Adjustment</option>
                <option value="REVERSAL">Reversal</option>
              </select>
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
