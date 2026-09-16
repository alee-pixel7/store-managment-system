// AuditCountPage Component
// Mobile-friendly screen for counting items during a stock audit

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAudit, searchAuditItems, countItem, getVarianceReport, finaliseAudit } from '../../api/audits';
import type { AuditDetail, SearchResult, VarianceReport } from '../../api/audits';

interface AuditCountPageProps {
  auditId: number;
  onBack: () => void;
}

export function AuditCountPage({ auditId, onBack }: AuditCountPageProps) {
  const { user } = useAuth();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [varianceReport, setVarianceReport] = useState<VarianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Count state
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [countValue, setCountValue] = useState('');
  const [counting, setCounting] = useState(false);

  // View state
  const [showVariance, setShowVariance] = useState(false);
  const [finalising, setFinalising] = useState(false);

  useEffect(() => {
    loadAudit();
  }, [auditId]);

  useEffect(() => {
    // Focus search input on mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const loadAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAudit(auditId);
      setAudit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const data = await searchAuditItems(auditId, searchQuery);
      setSearchResults(data.items);

      // If exactly one result, auto-select it
      if (data.items.length === 1) {
        setSelectedItem(data.items[0]);
        setCountValue(data.items[0].countedQty?.toString() || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleCount = async () => {
    if (!selectedItem || !countValue) return;

    setCounting(true);
    setError(null);
    try {
      const qty = parseFloat(countValue);
      if (isNaN(qty)) {
        setError('Please enter a valid number');
        return;
      }

      await countItem(auditId, selectedItem.itemId, qty, user?.full_name || 'Unknown');

      // Reset and refresh
      setSelectedItem(null);
      setCountValue('');
      setSearchQuery('');
      setSearchResults([]);
      await loadAudit();

      // Re-focus search
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to count item');
    } finally {
      setCounting(false);
    }
  };

  const handleLoadVariance = async () => {
    try {
      const report = await getVarianceReport(auditId);
      setVarianceReport(report);
      setShowVariance(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load variance report');
    }
  };

  const handleFinalise = async () => {
    if (!window.confirm('Finalise this audit? This will create ADJUST transactions for all variances and cannot be undone.')) {
      return;
    }

    setFinalising(true);
    try {
      await finaliseAudit(auditId);
      await loadAudit();
      setShowVariance(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalise audit');
    } finally {
      setFinalising(false);
    }
  };

  const progress = audit ? (audit.countedItems / audit.totalItems) * 100 : 0;
  const isFinalised = audit?.status === 'FINALISED';

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-text-secondary">Loading audit...</div>
      </div>
    );
  }

  if (error && !audit) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={onBack} className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-surface border-b border-border px-3 sm:px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              className="px-3 py-2 text-sm font-medium text-text bg-gray-200 rounded hover:bg-gray-300 min-h-[44px]"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-text">Audit #{auditId}</h1>
              <div className="text-xs text-text-secondary">
                {audit?.countedItems}/{audit?.totalItems} counted
                {audit?.variances ? ` • ${audit.variances} var` : ''}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!isFinalised && (
              <button
                onClick={handleLoadVariance}
                className="px-3 py-2 text-sm font-medium text-text bg-gray-200 rounded hover:bg-gray-300 min-h-[44px]"
              >
                Variance
              </button>
            )}
            {isFinalised && (
              <span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded">
                Finalised
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-accent h-2.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Variance Report Modal */}
      {showVariance && varianceReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">Variance Report</h2>
              <button onClick={() => setShowVariance(false)} className="text-text-secondary hover:text-text">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-elevated p-3 rounded">
                  <div className="text-xs text-text-secondary">Total Items</div>
                  <div className="text-lg font-bold">{varianceReport.totalItems}</div>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <div className="text-xs text-text-secondary">With Variance</div>
                  <div className="text-lg font-bold text-red-600">{varianceReport.itemsWithVariance}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <div className="text-xs text-text-secondary">Total Value</div>
                  <div className="text-lg font-bold text-orange-600">₹{varianceReport.totalVarianceValue.toFixed(0)}</div>
                </div>
              </div>

              {varianceReport.variances.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-elevated">
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Item</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">System</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Counted</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Variance</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {varianceReport.variances.map((v) => (
                      <tr key={v.itemCode}>
                        <td className="px-3 py-2">
                          <div className="font-mono text-xs text-accent">{v.itemCode}</div>
                          <div className="text-text">{v.itemName}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{v.systemQty}</td>
                        <td className="px-3 py-2 text-right font-medium">{v.countedQty}</td>
                        <td className={`px-3 py-2 text-right font-medium ${v.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {v.variance > 0 ? '+' : ''}{v.variance}
                        </td>
                        <td className="px-3 py-2 text-right">₹{v.varianceValue.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-4 text-text-secondary">No variances found</div>
              )}
            </div>
            {!isFinalised && varianceReport.itemsWithVariance > 0 && (
              <div className="px-4 py-3 border-t border-border flex justify-end">
                <button
                  onClick={handleFinalise}
                  disabled={finalising}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {finalising ? 'Finalising...' : 'Finalise & Create ADJUST'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Count Section */}
      {!isFinalised && (
        <div className="p-2 sm:p-4">
          {/* Search Box */}
          <div className="bg-surface rounded-lg shadow p-3 sm:p-4 mb-4">
            <label className="text-sm font-medium text-text block mb-2">
              Search or Scan Item
            </label>
            <div className="flex gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter item code, name, or scan barcode..."
                className="flex-1 px-4 py-3 text-lg border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent min-h-[52px]"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-3 text-sm font-medium text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50 min-h-[52px] min-w-[52px]"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedItem && (
            <div className="bg-surface rounded-lg shadow mb-4">
              <div className="px-4 py-2 border-b border-border text-sm font-medium text-text">
                {searchResults.length} result(s) found
              </div>
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.itemId}
                    onClick={() => {
                      setSelectedItem(item);
                      setCountValue(item.countedQty?.toString() || '');
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-hover flex items-center justify-between min-h-[60px]"
                  >
                    <div>
                      <div className="font-mono text-sm text-accent">{item.itemCode}</div>
                      <div className="text-sm text-text">{item.itemName}</div>
                      {item.brand && <div className="text-xs text-text-secondary">{item.brand}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-text-secondary">System: {item.systemQty} {item.unit}</div>
                      {item.countedQty !== null && (
                        <div className="text-xs text-green-600">Counted: {item.countedQty}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Count Input */}
          {selectedItem && (
            <div className="bg-surface rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-mono text-sm text-accent">{selectedItem.itemCode}</div>
                  <div className="font-medium text-text">{selectedItem.itemName}</div>
                  {selectedItem.brand && <div className="text-sm text-text-secondary">{selectedItem.brand}</div>}
                </div>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setCountValue('');
                  }}
                  className="p-2 text-text-secondary hover:text-text min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="bg-elevated rounded p-3 mb-4">
                <div className="text-sm text-text-secondary">System Quantity</div>
                <div className="text-2xl font-bold text-text">{selectedItem.systemQty} {selectedItem.unit}</div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-text block mb-2">
                  Physical Count
                </label>
                <input
                  type="number"
                  value={countValue}
                  onChange={(e) => setCountValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCount()}
                  placeholder="Enter counted quantity"
                  inputMode="numeric"
                  className="w-full px-4 py-4 text-3xl font-bold border-2 border-border rounded focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-center min-h-[64px]"
                  autoFocus
                />
                {countValue && (
                  <div className="mt-2 text-center">
                    {parseFloat(countValue) === selectedItem.systemQty ? (
                      <span className="text-green-600 text-sm font-medium">✓ Match</span>
                    ) : (
                      <span className="text-red-600 text-sm font-medium">
                        Variance: {parseFloat(countValue) - selectedItem.systemQty > 0 ? '+' : ''}
                        {parseFloat(countValue) - selectedItem.systemQty} {selectedItem.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleCount}
                disabled={counting || !countValue}
                className="w-full py-4 text-lg font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 min-h-[56px]"
              >
                {counting ? 'Saving...' : 'Save Count'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* All Items List (for review) */}
      {audit && audit.lines.length > 0 && (
        <div className="p-2 sm:p-4">
          <div className="bg-surface rounded-lg shadow">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-medium text-text">All Items ({audit.lines.length})</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {audit.lines.map((line) => (
                <div key={line.id} className="px-3 sm:px-4 py-2.5 flex items-center justify-between text-sm min-h-[48px]">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-accent">{line.itemCode}</div>
                    <div className="text-text truncate">{line.itemName}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-text-secondary">Sys: {line.systemQty}</div>
                    {line.countedQty !== null ? (
                      <div className={`font-medium ${line.variance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Cnt: {line.countedQty}
                        {line.variance !== 0 && ` (${line.variance! > 0 ? '+' : ''}${line.variance})`}
                      </div>
                    ) : (
                      <div className="text-gray-400">Not counted</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
