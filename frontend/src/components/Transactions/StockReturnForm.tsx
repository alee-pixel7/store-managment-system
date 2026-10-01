import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchItem, StockInLineItem } from '../../types';
import { createReturn } from '../../api/transactions';
import { todayISO } from '../../lib/dates';
import { ItemSearch } from './ItemSearch';
import { SupplierSelect } from './SupplierSelect';
import { DateField } from '../ui/DateField';

interface StockReturnFormProps {
  onSaved?: () => void;
}

export function StockReturnForm({ onSaved }: StockReturnFormProps) {
  const [txnDate, setTxnDate] = useState(todayISO());
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<StockInLineItem[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ txn_no: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (selectedLineIndex !== null && quantityRefs.current[selectedLineIndex]) {
      quantityRefs.current[selectedLineIndex]?.focus();
      quantityRefs.current[selectedLineIndex]?.select();
    }
  }, [selectedLineIndex]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const generateLineId = () => `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

  const updateLine = (index: number, field: keyof StockInLineItem, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
    if (selectedLineIndex === index) {
      setSelectedLineIndex(null);
    } else if (selectedLineIndex !== null && selectedLineIndex > index) {
      setSelectedLineIndex(selectedLineIndex - 1);
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, _index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      searchInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  };

  const validate = (): string | null => {
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
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await createReturn({
        txn_date: txnDate,
        supplier_id: supplierId || undefined,
        remarks: remarks || undefined,
        items: lines.map((line) => ({
          item_id: line.item_id,
          quantity: parseFloat(line.quantity),
          line_remarks: line.line_remarks || undefined,
        })),
      });

      setSuccess({ txn_no: result.txn_no });
      onSaved?.();

      setTxnDate(todayISO());
      setSupplierId(null);
      setRemarks('');
      setLines([]);
      setSelectedLineIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save return');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-elevated overflow-hidden">
      {/* Toasts */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 p-4 card border-ok/15 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-ok/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ok">Return saved successfully!</p>
              <p className="text-xs text-text-secondary font-mono">{success.txn_no}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-hover transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 card p-4 border-danger/15 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-danger flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-hover transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-5 border-b border-border-light">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-low/10 flex items-center justify-center shadow-lg shadow-low/10">
            <svg className="w-5 h-5 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Stock Return</h2>
            <p className="text-xs text-text-secondary">Items returned by people or departments back into stock</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Date *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <DateField value={txnDate} onChange={setTxnDate} className="w-full [&_input]:pl-10 [&_input]:border [&_input]:border-border [&_input]:rounded-xl [&_input]:min-h-[44px]" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Supplier (optional)</label>
            <SupplierSelect value={supplierId} onChange={setSupplierId} />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Remarks</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Reason for return"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-low/25 focus:border-low/40 bg-transparent outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Items</h3>
          <span className="text-xs text-text-secondary bg-elevated px-2.5 py-1 rounded-full font-medium">{lines.length} item(s)</span>
        </div>

        <div className="mb-4" data-search-input>
          <ItemSearch onSelect={handleItemSelect} placeholder="Search and add items being returned..." />
        </div>

        {/* Desktop Table */}
        {lines.length > 0 && (
          <div className="hidden sm:block border border-border-light rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-low/5 to-transparent border-b border-border-light">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-wider w-8">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Item</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-text-secondary uppercase tracking-wider w-20">Stock</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-text-secondary uppercase tracking-wider w-24">Qty *</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-text-secondary uppercase tracking-wider w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {lines.map((line, index) => (
                  <tr
                    key={line.id}
                    className={`${index % 2 === 0 ? '' : 'bg-elevated/30'} ${selectedLineIndex === index ? 'bg-low/5' : 'hover:bg-hover'} transition-colors`}
                  >
                    <td className="px-3 py-2 text-text-muted">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs text-low font-medium">{line.item_code}</div>
                      <div className="text-sm text-text truncate max-w-xs">{line.item_name}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${line.current_stock > 0 ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger'}`}>
                        {line.current_stock}
                      </span>
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
                        className="w-full px-2 py-1 text-sm text-right border border-border rounded-lg focus:ring-2 focus:ring-low/25 focus:border-low/40 bg-transparent outline-none font-mono transition-all"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => removeLine(index)}
                        className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                        title="Remove line"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Cards */}
        {lines.length > 0 && (
          <div className="sm:hidden space-y-3">
            {lines.map((line, index) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 card border ${selectedLineIndex === index ? 'border-low/30 ring-2 ring-low/10' : 'border-border-light'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-low font-medium">{line.item_code}</div>
                    <div className="text-sm text-text truncate">{line.item_name}</div>
                  </div>
                  <button
                    onClick={() => removeLine(index)}
                    className="ml-2 p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">Qty *</label>
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
                    className="w-full px-3 py-2.5 text-base font-mono text-right border border-border rounded-xl focus:ring-2 focus:ring-low/25 focus:border-low/40 bg-transparent outline-none min-h-[48px] transition-all"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {lines.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center justify-center py-10"
          >
            <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary font-medium">No items added</p>
            <p className="text-xs text-text-muted mt-1">Search and add items being returned</p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border-light bg-elevated/30 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setLines([]);
            setSelectedLineIndex(null);
            setError(null);
          }}
          className="btn btn-ghost btn-lg min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Clear All
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || lines.length === 0}
          className="btn btn-lg min-h-[44px] font-semibold text-base bg-gradient-to-r from-low to-low/80 hover:shadow-lg hover:shadow-low/20 disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save Return
            </>
          )}
        </button>
      </div>
    </div>
  );
}
