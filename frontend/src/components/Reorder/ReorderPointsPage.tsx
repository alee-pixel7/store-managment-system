// ReorderPointsPage Component
// Shows current min_stock vs suggested min_stock with accept functionality

import { useState, useEffect, useMemo } from 'react';
import {
  getReorderSuggestions,
  acceptSuggestion,
  acceptBulkSuggestions,
} from '../../api/reorder';
import type { ReorderSuggestion } from '../../api/reorder';

type Filter = 'all' | 'needs-update' | 'current-ok' | 'over-stocked';

export function ReorderPointsPage() {
  const [data, setData] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [accepting, setAccepting] = useState<number | null>(null);
  const [bulkAccepting, setBulkAccepting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    getReorderSuggestions().then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Clear message after 3s
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'needs-update': return data.filter(d => d.difference > 0);
      case 'current-ok': return data.filter(d => d.difference === 0);
      case 'over-stocked': return data.filter(d => d.difference < 0);
      default: return data;
    }
  }, [data, filter]);

  const counts = useMemo(() => ({
    needsUpdate: data.filter(d => d.difference > 0).length,
    currentOk: data.filter(d => d.difference === 0).length,
    overStocked: data.filter(d => d.difference < 0).length,
  }), [data]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(d => d.itemId)));
    }
  };

  const handleAcceptOne = async (itemId: number) => {
    setAccepting(itemId);
    try {
      const result = await acceptSuggestion(itemId);
      setMessage({ type: 'success', text: `Updated min_stock to ${result.newMinStock}` });
      // Update local data
      setData(prev => prev.map(d =>
        d.itemId === itemId
          ? { ...d, currentMinStock: result.newMinStock, difference: 0 }
          : d
      ));
      setSelected(prev => { const next = new Set(prev); next.delete(itemId); return next; });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setAccepting(null);
    }
  };

  const handleAcceptBulk = async () => {
    if (selected.size === 0) return;
    setBulkAccepting(true);
    try {
      const result = await acceptBulkSuggestions(Array.from(selected));
      setMessage({ type: 'success', text: `Accepted ${result.accepted} suggestions` });
      // Reload to get fresh data
      load();
      setSelected(new Set());
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setBulkAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text">Smart Reorder Points</h1>
            <p className="text-sm text-text-secondary mt-0.5">Based on last 6 months consumption + lead time</p>
          </div>
          {selected.size > 0 && (
            <button
              onClick={handleAcceptBulk}
              disabled={bulkAccepting}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
            >
              {bulkAccepting ? 'Accepting...' : `Accept ${selected.size} Suggestion${selected.size > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-3 px-4 py-2 rounded text-sm ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="bg-surface border-b border-border px-4">
        <div className="flex gap-1 overflow-x-auto">
          {([
            { id: 'all' as Filter, label: `All (${data.length})` },
            { id: 'needs-update' as Filter, label: `Needs Update (${counts.needsUpdate})` },
            { id: 'current-ok' as Filter, label: `Current OK (${counts.currentOk})` },
            { id: 'over-stocked' as Filter, label: `Over-Stocked (${counts.overStocked})` },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                filter === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading suggestions...</div>
        ) : (
          <div className="bg-surface rounded-lg shadow overflow-hidden">
            {/* Select all */}
            <div className="px-4 py-2 border-b border-border bg-elevated flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm text-text-secondary">
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-elevated border-b border-border">
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                    <th className="px-3 py-2 text-right font-medium text-text-secondary">Stock</th>
                    <th className="px-3 py-2 text-right font-medium text-text-secondary">Current Min</th>
                    <th className="px-3 py-2 text-right font-medium text-text-secondary">Suggested Min</th>
                    <th className="px-3 py-2 text-right font-medium text-text-secondary">Diff</th>
                    <th className="px-3 py-2 text-right font-medium text-text-secondary">Avg Monthly</th>
                    <th className="px-3 py-2 text-right font-medium text-text-secondary">Lead Time</th>
                    <th className="px-3 py-2 text-center font-medium text-text-secondary">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => (
                    <tr key={item.itemId} className={`hover:bg-hover ${
                      selected.has(item.itemId) ? 'bg-accent-dim' : ''
                    }`}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(item.itemId)}
                          onChange={() => toggleSelect(item.itemId)}
                          className="w-4 h-4 rounded border-border"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-accent">{item.itemCode}</div>
                        <div className="text-text truncate max-w-[180px]">{item.itemName}</div>
                        {item.lastSupplier && (
                          <div className="text-xs text-text-secondary">via {item.lastSupplier}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{item.currentStock} {item.unit}</td>
                      <td className="px-3 py-2 text-right font-mono">{item.currentMinStock}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-mono font-medium ${
                          item.suggestedMinStock > item.currentMinStock ? 'text-orange-600' :
                          item.suggestedMinStock < item.currentMinStock ? 'text-accent' :
                          'text-text'
                        }`}>
                          {item.suggestedMinStock}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.difference !== 0 && (
                          <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                            item.difference > 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-accent-dim text-accent'
                          }`}>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary">
                        {item.avgMonthlyConsumption}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary">
                        {item.leadTimeDays}d
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.difference !== 0 && (
                          <button
                            onClick={() => handleAcceptOne(item.itemId)}
                            disabled={accepting === item.itemId}
                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 min-h-[36px]"
                          >
                            {accepting === item.itemId ? '...' : 'Accept'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-12 text-center text-text-secondary">
                        No items match this filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
