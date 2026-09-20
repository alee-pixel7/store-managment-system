import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchItem, StockInLineItem } from '../../types';
import { createStockIn } from '../../api/transactions';
import { ItemSearch } from './ItemSearch';
import { SupplierSelect } from './SupplierSelect';

interface StockInFormProps {
  onSaved?: () => void;
}

export function StockInForm({ onSaved }: StockInFormProps) {
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
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
    if (success) {
      const t = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(t);
    }
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
    if (selectedLineIndex === index) setSelectedLineIndex(null);
    else if (selectedLineIndex !== null && selectedLineIndex > index) setSelectedLineIndex(selectedLineIndex - 1);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rateInput = document.querySelector(`[data-rate-index="${index}"]`) as HTMLInputElement;
      rateInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  };

  const handleRateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      searchInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  };

  const validate = (): string | null => {
    if (lines.length === 0) return 'At least one item is required';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.quantity || parseFloat(line.quantity) <= 0) return `Line ${i + 1}: Quantity must be greater than 0`;
      if (line.rate && parseFloat(line.rate) < 0) return `Line ${i + 1}: Rate cannot be negative`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
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

  const total = lines.reduce((sum, line) => {
    return sum + (parseFloat(line.quantity) || 0) * (parseFloat(line.rate) || 0);
  }, 0);

  return (
    <div className="glass rounded-2xl border border-border-light shadow-xl overflow-hidden">
      {/* Success Toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-ok/5 border-b border-ok/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-ok/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-ok text-sm">Stock In saved successfully!</p>
                    <p className="text-xs text-ok/70 mt-0.5">Transaction: {success.txn_no}</p>
                  </div>
                </div>
                <button onClick={() => setSuccess(null)} className="p-2 text-ok/60 hover:text-ok rounded-lg hover:bg-ok/10 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-danger/5 border-b border-danger/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-danger/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-sm text-danger font-medium">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="p-2 text-danger/60 hover:text-danger rounded-lg hover:bg-danger/10 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="p-6 border-b border-border-light">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Date */}
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Date *</label>
            <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <input
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm bg-transparent outline-none min-h-[44px] font-mono"
              />
            </div>
          </div>

          {/* Invoice No */}
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Invoice No</label>
            <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Invoice number"
                className="flex-1 px-4 py-2.5 text-sm bg-transparent outline-none min-h-[44px]"
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Supplier</label>
            <div className="flex items-center border border-border rounded-xl focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V7.5a3 3 0 013-3h3.75" />
                </svg>
              </div>
              <div className="flex-1 min-h-[44px] flex items-center overflow-hidden">
                <SupplierSelect value={supplierId} onChange={setSupplierId} />
              </div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="mt-5">
          <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Remarks</label>
          <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
            <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks"
              className="flex-1 px-4 py-2.5 text-sm bg-transparent outline-none min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-text">Items</h3>
            {lines.length > 0 && (
              <span className="text-[10px] font-bold text-accent bg-accent-dim px-2.5 py-0.5 rounded-full border border-accent/15">
                {lines.length}
              </span>
            )}
          </div>
        </div>

        {/* Item Search */}
        <div className="mb-4" data-search-input>
          <ItemSearch onSelect={handleItemSelect} placeholder="Search and add items..." />
        </div>

        {/* Line Items - Desktop Table */}
        {lines.length > 0 && (
          <div className="hidden sm:block border border-border-light rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-accent/5 via-transparent to-transparent border-b border-border-light">
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-8">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Item</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-20">Stock</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-24">Qty *</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-24">Rate</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-24">Amount</th>
                  <th className="px-4 py-3 text-center font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {lines.map((line, index) => {
                  const isSelected = selectedLineIndex === index;
                  const stockNum = line.current_stock ?? 0;
                  return (
                    <tr
                      key={line.id}
                      className={`transition-colors ${isSelected ? 'bg-accent-dim border-l-2 border-l-accent' : 'hover:bg-hover odd:bg-elevated/20'}`}
                    >
                      <td className="px-4 py-3 text-text-muted text-xs font-medium">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-accent font-medium">{line.item_code}</div>
                        <div className="text-sm text-text truncate max-w-xs">{line.item_name}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium ${stockNum > 0 ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger'}`}>
                          {stockNum}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                          className="w-full px-2 py-1.5 text-sm text-right border border-border rounded-lg focus:ring-2 focus:ring-accent/25 focus:border-accent/40 font-mono bg-transparent outline-none transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={line.rate}
                          onChange={(e) => updateLine(index, 'rate', e.target.value)}
                          onKeyDown={(e) => handleRateKeyDown(e, index)}
                          data-rate-index={index}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 text-sm text-right border border-border rounded-lg focus:ring-2 focus:ring-accent/25 focus:border-accent/40 font-mono bg-transparent outline-none transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-text">
                        {((parseFloat(line.quantity) || 0) * (parseFloat(line.rate) || 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeLine(index)}
                          className="w-8 h-8 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
                          title="Remove line"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 border-t border-accent/15">
                  <td colSpan={5} className="px-4 py-3 text-right font-semibold text-text text-sm">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-lg text-accent">
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
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 glass rounded-xl border transition-all ${
                  selectedLineIndex === index ? 'ring-2 ring-accent/30 border-accent/30' : 'border-border-light'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-accent font-medium">{line.item_code}</div>
                    <div className="text-sm text-text truncate">{line.item_name}</div>
                  </div>
                  <button
                    onClick={() => removeLine(index)}
                    className="ml-2 p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] block mb-1.5">Qty *</label>
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
                      className="w-full px-3 py-2.5 text-base font-mono text-right border border-border rounded-xl focus:ring-2 focus:ring-accent/25 focus:border-accent/40 min-h-[48px] bg-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] block mb-1.5">Rate</label>
                    <input
                      type="number"
                      value={line.rate}
                      onChange={(e) => updateLine(index, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      inputMode="decimal"
                      className="w-full px-3 py-2.5 text-base font-mono text-right border border-border rounded-xl focus:ring-2 focus:ring-accent/25 focus:border-accent/40 min-h-[48px] bg-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Amount:</span>
                  <span className="font-mono font-bold text-text">
                    {((parseFloat(line.quantity) || 0) * (parseFloat(line.rate) || 0)).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
            {/* Mobile Total */}
            <div className="p-4 glass rounded-xl border border-accent/15 bg-gradient-to-r from-accent/5 to-transparent">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text">Total</span>
                <span className="font-mono font-bold text-xl text-accent">{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {lines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-2xl bg-accent-dim flex items-center justify-center mb-4 shadow-lg shadow-accent/10"
            >
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </motion.div>
            <p className="text-text-secondary font-medium text-sm">No items added yet</p>
            <p className="text-text-muted text-xs mt-1">Search above to add items to this stock in</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border-light bg-elevated/30 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={() => { setLines([]); setSelectedLineIndex(null); setError(null); }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-hover hover:text-text min-h-[44px] transition-all"
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
          className="flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-base bg-gradient-to-r from-accent to-accent-press rounded-xl hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-all"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Save Stock In
            </>
          )}
        </button>
      </div>
    </div>
  );
}
