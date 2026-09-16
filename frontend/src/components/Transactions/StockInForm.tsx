// StockInForm Component
// Form for creating stock in transactions with multiple line items

import { useState, useRef, useEffect } from 'react';
import type { SearchItem, StockInLineItem } from '../../types';
import { createStockIn } from '../../api/transactions';
import { ItemSearch } from './ItemSearch';
import { SupplierSelect } from './SupplierSelect';

interface StockInFormProps {
  onSaved?: () => void;
}

export function StockInForm({ onSaved }: StockInFormProps) {
  // Header fields
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Line items
  const [lines, setLines] = useState<StockInLineItem[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ txn_no: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for keyboard navigation
  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus quantity field when a line is selected
  useEffect(() => {
    if (selectedLineIndex !== null && quantityRefs.current[selectedLineIndex]) {
      quantityRefs.current[selectedLineIndex]?.focus();
      quantityRefs.current[selectedLineIndex]?.select();
    }
  }, [selectedLineIndex]);

  // Generate unique ID for line items
  const generateLineId = () => `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add new line when item is selected from search
  const handleItemSelect = (item: SearchItem) => {
    const newLine: StockInLineItem = {
      id: generateLineId(),
      item_id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      current_stock: item.current_stock,
      unit: item.unit,
      quantity: '',
      rate: '',
      line_remarks: '',
    };

    setLines([...lines, newLine]);
    setSelectedLineIndex(lines.length);
  };

  // Update line item field
  const updateLine = (index: number, field: keyof StockInLineItem, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  // Remove line item
  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
    if (selectedLineIndex === index) {
      setSelectedLineIndex(null);
    } else if (selectedLineIndex !== null && selectedLineIndex > index) {
      setSelectedLineIndex(selectedLineIndex - 1);
    }
  };

  // Handle quantity field keydown
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to rate field
      const rateInput = document.querySelector(`[data-rate-index="${index}"]`) as HTMLInputElement;
      rateInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  };

  // Handle rate field keydown
  const handleRateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Add new line - focus search box
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      searchInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  };

  // Validate form
  const validate = (): string | null => {
    if (lines.length === 0) {
      return 'At least one item is required';
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.quantity || parseFloat(line.quantity) <= 0) {
        return `Line ${i + 1}: Quantity must be greater than 0`;
      }
      if (line.rate && parseFloat(line.rate) < 0) {
        return `Line ${i + 1}: Rate cannot be negative`;
      }
    }

    return null;
  };

  // Submit form
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await createStockIn({
        txn_date: txnDate,
        supplier_id: supplierId || undefined,
        invoice_no: invoiceNo || undefined,
        remarks: remarks || undefined,
        items: lines.map((line) => ({
          item_id: line.item_id,
          quantity: parseFloat(line.quantity),
          rate: line.rate ? parseFloat(line.rate) : undefined,
          line_remarks: line.line_remarks || undefined,
        })),
      });

      setSuccess({ txn_no: result.txn_no });
      onSaved?.();

      // Reset form
      setTxnDate(new Date().toISOString().split('T')[0]);
      setSupplierId(null);
      setInvoiceNo('');
      setRemarks('');
      setLines([]);
      setSelectedLineIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  // Calculate total
  const total = lines.reduce((sum, line) => {
    const qty = parseFloat(line.quantity) || 0;
    const rate = parseFloat(line.rate) || 0;
    return sum + qty * rate;
  }, 0);

  return (
    <div className="bg-surface rounded-lg shadow">
      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-xl">✓</span>
              <div>
                <p className="font-medium text-green-800">Stock In saved successfully!</p>
                <p className="text-sm text-green-600">Transaction No: {success.txn_no}</p>
              </div>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 hover:text-green-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">!</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text mb-4">Stock In</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Date *</label>
            <input
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
            />
          </div>

          {/* Supplier */}
          <div className="sm:col-span-2 md:col-span-2">
            <label className="block text-sm font-medium text-text mb-1">Supplier</label>
            <SupplierSelect
              value={supplierId}
              onChange={setSupplierId}
            />
          </div>

          {/* Invoice No */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Invoice No</label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Invoice number"
              className="w-full px-3 py-2.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
            />
          </div>
        </div>

        {/* Remarks */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-text mb-1">Remarks</label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional remarks"
            className="w-full px-3 py-2.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
          />
        </div>
      </div>

      {/* Line Items Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text">Items</h3>
          <span className="text-sm text-text-secondary">{lines.length} item(s)</span>
        </div>

        {/* Item Search */}
        <div className="mb-4" data-search-input>
          <ItemSearch
            onSelect={handleItemSelect}
            placeholder="Search and add items..."
          />
        </div>

        {/* Line Items - Desktop Table */}
        {lines.length > 0 && (
          <div className="hidden sm:block border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-elevated border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary w-8">#</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary w-20">Stock</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary w-24">Qty *</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary w-24">Rate</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary w-24">Amount</th>
                  <th className="px-3 py-2 text-center font-medium text-text-secondary w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((line, index) => (
                  <tr
                    key={line.id}
                    className={selectedLineIndex === index ? 'bg-accent-dim' : 'hover:bg-hover'}
                  >
                    <td className="px-3 py-2 text-text-secondary">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs text-accent">{line.item_code}</div>
                      <div className="text-sm text-text truncate max-w-xs">{line.item_name}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-text-secondary">
                      {line.current_stock}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        ref={(el) => { quantityRefs.current[index] = el; }}
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                        onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                        onFocus={() => setSelectedLineIndex(index)}
                        min="0"
                        step="1"
                        placeholder="0"
                        className="w-full px-2 py-1 text-sm text-right border border-border rounded focus:ring-1 focus:ring-accent font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={line.rate}
                        onChange={(e) => updateLine(index, 'rate', e.target.value)}
                        onKeyDown={(e) => handleRateKeyDown(e, index)}
                        data-rate-index={index}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-2 py-1 text-sm text-right border border-border rounded focus:ring-1 focus:ring-accent font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-text">
                      {((parseFloat(line.quantity) || 0) * (parseFloat(line.rate) || 0)).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Remove line"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-elevated border-t border-border">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right font-medium text-text">
                    Total:
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-text">
                    {total.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Line Items - Mobile Cards */}
        {lines.length > 0 && (
          <div className="sm:hidden space-y-3">
            {lines.map((line, index) => (
              <div
                key={line.id}
                className={`p-3 rounded-lg border border-border bg-surface ${
                  selectedLineIndex === index ? 'ring-2 ring-accent' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-accent">{line.item_code}</div>
                    <div className="text-sm text-text truncate">{line.item_name}</div>
                  </div>
                  <button
                    onClick={() => removeLine(index)}
                    className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Qty *</label>
                    <input
                      ref={(el) => { quantityRefs.current[index] = el; }}
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                      onFocus={() => setSelectedLineIndex(index)}
                      min="0"
                      step="1"
                      placeholder="0"
                      inputMode="numeric"
                      className="w-full px-3 py-2.5 text-base font-mono text-right border border-border rounded focus:ring-2 focus:ring-accent min-h-[48px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Rate</label>
                    <input
                      type="number"
                      value={line.rate}
                      onChange={(e) => updateLine(index, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      inputMode="decimal"
                      className="w-full px-3 py-2.5 text-base font-mono text-right border border-border rounded focus:ring-2 focus:ring-accent min-h-[48px]"
                    />
                  </div>
                </div>
                <div className="mt-2 text-right text-sm text-text-secondary">
                  Amount: <span className="font-mono font-medium">₹{((parseFloat(line.quantity) || 0) * (parseFloat(line.rate) || 0)).toFixed(2)}</span>
                </div>
                <input
                  type="text"
                  value={line.line_remarks}
                  onChange={(e) => updateLine(index, 'line_remarks', e.target.value)}
                  placeholder="Remarks (optional)"
                  className="w-full mt-2 px-3 py-2 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
                />
              </div>
            ))}
            {/* Mobile Total */}
            <div className="p-3 bg-elevated rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">Total:</span>
                <span className="font-mono font-semibold text-lg">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {lines.length === 0 && (
          <div className="text-center py-8 text-text-secondary text-sm">
            Search and add items to create a stock in entry
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-elevated flex flex-col sm:flex-row justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setLines([]);
            setSelectedLineIndex(null);
            setError(null);
          }}
          className="px-4 py-2.5 text-sm text-text bg-surface border border-border rounded hover:bg-hover min-h-[44px]"
        >
          Clear All
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || lines.length === 0}
          className="px-6 py-2.5 text-sm font-medium text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {saving ? 'Saving...' : 'Save Stock In'}
        </button>
      </div>
    </div>
  );
}
