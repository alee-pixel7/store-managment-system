// StockOutForm Component
// Form for creating stock out transactions with inline warnings

import { useState, useRef, useEffect, useCallback } from 'react';
import type { SearchItem, StockOutLineItem } from '../../types';
import { createStockOut } from '../../api/transactions';
import { ItemSearch } from './ItemSearch';
import { DepartmentSelect } from './DepartmentSelect';
import { MachineSelect } from './MachineSelect';
import { PersonSelect } from './PersonSelect';

interface StockOutFormProps {
  onSaved?: () => void;
}

export function StockOutForm({ onSaved }: StockOutFormProps) {
  // Header fields
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [personId, setPersonId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [machineId, setMachineId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');

  // Line items
  const [lines, setLines] = useState<StockOutLineItem[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ txn_no: string; warnings: Array<{ item_code: string; message: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNegativeConfirm, setShowNegativeConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

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
  const handleItemSelect = useCallback((item: SearchItem) => {
    const newLine: StockOutLineItem = {
      id: generateLineId(),
      item_id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      current_stock: item.current_stock,
      unit: item.unit,
      quantity: '',
      line_remarks: '',
    };

    setLines((prev) => {
      const updated = [...prev, newLine];
      setSelectedLineIndex(updated.length - 1);
      return updated;
    });
  }, []);

  // Update line item field and compute warnings
  const updateLine = useCallback((index: number, field: keyof StockOutLineItem, value: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Check for negative stock warning
      if (field === 'quantity') {
        const qty = parseFloat(value) || 0;
        const stock = updated[index].current_stock;
        if (qty > stock) {
          updated[index].warning = `Qty exceeds stock (${stock})`;
        } else {
          updated[index].warning = undefined;
        }
      }

      return updated;
    });
  }, []);

  // Remove line item
  const removeLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
    if (selectedLineIndex === index) {
      setSelectedLineIndex(null);
    } else if (selectedLineIndex !== null && selectedLineIndex > index) {
      setSelectedLineIndex(selectedLineIndex - 1);
    }
  }, [selectedLineIndex]);

  // Handle quantity field keydown
  const handleQuantityKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move focus to remarks or next line
      const remarksInput = document.querySelector(`[data-remarks-index="${index}"]`) as HTMLInputElement;
      remarksInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  }, []);

  // Handle remarks field keydown
  const handleRemarksKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus search box for next item
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      searchInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  }, []);

  // Validate form
  const validate = useCallback((): string | null => {
    if (lines.length === 0) {
      return 'At least one item is required';
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.quantity || parseFloat(line.quantity) <= 0) {
        return `Line ${i + 1}: Quantity must be greater than 0`;
      }
    }

    return null;
  }, [lines]);

  // Check if any item would go negative
  const hasNegativeItems = useCallback(() => {
    return lines.some((line) => {
      const qty = parseFloat(line.quantity) || 0;
      return qty > line.current_stock;
    });
  }, [lines]);

  // Submit form
  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Show confirmation if any item would go negative
    if (hasNegativeItems()) {
      setShowNegativeConfirm(true);
      setPendingSubmit(true);
      return;
    }

    await doSubmit();
  }, [validate, hasNegativeItems]);

  const doSubmit = useCallback(async () => {
    setSaving(true);
    setError(null);
    setShowNegativeConfirm(false);
    setPendingSubmit(false);

    try {
      const result = await createStockOut({
        txn_date: txnDate,
        department_id: departmentId || undefined,
        machine_id: machineId || undefined,
        person_id: personId || undefined,
        purpose: purpose || undefined,
        remarks: remarks || undefined,
        items: lines.map((line) => ({
          item_id: line.item_id,
          quantity: parseFloat(line.quantity),
          line_remarks: line.line_remarks || undefined,
        })),
      });

      setSuccess({
        txn_no: result.transaction.txn_no,
        warnings: result.warnings,
      });

      // Reset form
      setTxnDate(new Date().toISOString().split('T')[0]);
      setPersonId(null);
      setDepartmentId(null);
      setMachineId(null);
      setPurpose('');
      setRemarks('');
      setLines([]);
      setSelectedLineIndex(null);

      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  }, [txnDate, departmentId, machineId, personId, purpose, remarks, lines, onSaved]);

  const cancelNegativeConfirm = useCallback(() => {
    setShowNegativeConfirm(false);
    setPendingSubmit(false);
  }, []);

  // Reset form for new issue
  const handleNewIssue = useCallback(() => {
    setSuccess(null);
    setTxnDate(new Date().toISOString().split('T')[0]);
    setPersonId(null);
    setDepartmentId(null);
    setMachineId(null);
    setPurpose('');
    setRemarks('');
    setLines([]);
    setSelectedLineIndex(null);
  }, []);

  return (
    <div className="bg-surface rounded-lg shadow">
      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-2xl">✓</span>
              <div>
                <p className="font-medium text-green-800 text-lg">Issue saved successfully!</p>
                <p className="text-sm text-green-700">
                  Slip No: <span className="font-mono font-bold">{success.txn_no}</span>
                </p>
                {success.warnings.length > 0 && (
                  <div className="mt-2">
                    {success.warnings.map((w, i) => (
                      <p key={i} className="text-sm text-amber-700">
                        ⚠ {w.item_code}: {w.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleNewIssue}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded hover:bg-accent-hover min-h-[44px]"
            >
              New Issue
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">!</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 min-h-[44px] min-w-[44px]">×</button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">Stock Issue</h2>
          <span className="text-sm text-text-secondary">{lines.length} item(s)</span>
        </div>

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

          {/* Issued To (Person) */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Issued To</label>
            <PersonSelect value={personId} onChange={setPersonId} />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Department</label>
            <DepartmentSelect value={departmentId} onChange={setDepartmentId} />
          </div>

          {/* Machine */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Machine</label>
            <MachineSelect departmentId={departmentId} value={machineId} onChange={setMachineId} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Why is this item being issued?"
              className="w-full px-3 py-2.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
            />
          </div>

          {/* Remarks */}
          <div>
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
      </div>

      {/* Line Items Section */}
      <div className="p-4">
        {/* Item Search with prominent camera scan on mobile */}
        <div className="mb-4" data-search-input>
          <ItemSearch onSelect={handleItemSelect} placeholder="Search and add items..." />
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
                  <th className="px-3 py-2 text-left font-medium text-text-secondary w-32">Remarks</th>
                  <th className="px-3 py-2 text-center font-medium text-text-secondary w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lines.map((line, index) => (
                  <tr
                    key={line.id}
                    className={`${selectedLineIndex === index ? 'bg-accent-dim' : 'hover:bg-hover'} ${line.warning ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-3 py-2 text-text-secondary">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs text-accent">{line.item_code}</div>
                      <div className="text-sm text-text truncate max-w-xs">{line.item_name}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-mono text-sm ${line.current_stock <= 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                        {line.current_stock}
                      </span>
                      <span className="text-xs text-text-secondary ml-1">{line.unit}</span>
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
                        className={`w-full px-2 py-1 text-sm text-right border rounded focus:ring-1 focus:ring-accent font-mono ${
                          line.warning ? 'border-amber-400 bg-amber-50' : 'border-border'
                        }`}
                      />
                      {line.warning && (
                        <p className="text-xs text-amber-600 mt-0.5">{line.warning}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.line_remarks}
                        onChange={(e) => updateLine(index, 'line_remarks', e.target.value)}
                        onKeyDown={(e) => handleRemarksKeyDown(e, index)}
                        data-remarks-index={index}
                        placeholder="Optional"
                        className="w-full px-2 py-1 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                      />
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
            </table>
          </div>
        )}

        {/* Line Items - Mobile Cards */}
        {lines.length > 0 && (
          <div className="sm:hidden space-y-3">
            {lines.map((line, index) => (
              <div
                key={line.id}
                className={`p-3 rounded-lg border ${
                  line.warning ? 'border-amber-400 bg-amber-50' : 'border-border bg-surface'
                } ${selectedLineIndex === index ? 'ring-2 ring-accent' : ''}`}
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
                <div className="flex items-center gap-3">
                  <div className="text-xs text-text-secondary">
                    Stock: <span className={`font-mono ${line.current_stock <= 0 ? 'text-red-600' : 'text-text'}`}>{line.current_stock}</span> {line.unit}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={(el) => { quantityRefs.current[index] = el; }}
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                      onFocus={() => setSelectedLineIndex(index)}
                      min="0"
                      step="1"
                      placeholder="Qty"
                      inputMode="numeric"
                      className={`w-full px-3 py-2.5 text-base font-mono text-right border rounded focus:ring-2 focus:ring-accent min-h-[48px] ${
                        line.warning ? 'border-amber-400 bg-amber-50' : 'border-border'
                      }`}
                    />
                  </div>
                </div>
                {line.warning && (
                  <p className="text-xs text-amber-600 mt-1">{line.warning}</p>
                )}
                <input
                  type="text"
                  value={line.line_remarks}
                  onChange={(e) => updateLine(index, 'line_remarks', e.target.value)}
                  placeholder="Remarks (optional)"
                  className="w-full mt-2 px-3 py-2 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
                />
              </div>
            ))}
          </div>
        )}

        {lines.length === 0 && (
          <div className="text-center py-8 text-text-secondary text-sm">
            Search and add items to create an issue
          </div>
        )}
      </div>

      {/* Negative Stock Confirmation Dialog */}
      {showNegativeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={cancelNegativeConfirm} />
          <div className="relative bg-surface rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <span className="text-amber-600 text-3xl">⚠</span>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Stock Will Go Negative</h3>
              <p className="text-sm text-text-secondary mb-4">
                The following items will have negative stock after this issue:
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 max-h-40 overflow-y-auto">
                {lines
                  .filter((line) => {
                    const qty = parseFloat(line.quantity) || 0;
                    return qty > line.current_stock;
                  })
                  .map((line, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="font-mono text-amber-800">{line.item_code}</span>
                      <span className="text-amber-700">
                        {line.current_stock} → {line.current_stock - (parseFloat(line.quantity) || 0)}
                      </span>
                    </div>
                  ))}
              </div>
              <p className="text-sm text-text-secondary mb-6">
                Do you want to proceed anyway?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelNegativeConfirm}
                  className="px-6 py-2.5 text-sm font-medium text-text bg-surface border border-border rounded hover:bg-hover min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={doSubmit}
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-amber-600 rounded hover:bg-amber-700 disabled:opacity-50 min-h-[44px]"
                >
                  {saving ? 'Saving...' : 'Yes, Save Anyway'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          {saving ? 'Saving...' : 'Save Issue'}
        </button>
      </div>
    </div>
  );
}
