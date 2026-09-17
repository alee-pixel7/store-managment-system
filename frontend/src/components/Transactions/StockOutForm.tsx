import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [personId, setPersonId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [machineId, setMachineId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<StockOutLineItem[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ txn_no: string; warnings: Array<{ item_code: string; message: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNegativeConfirm, setShowNegativeConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (selectedLineIndex !== null && quantityRefs.current[selectedLineIndex]) {
      quantityRefs.current[selectedLineIndex]?.focus();
      quantityRefs.current[selectedLineIndex]?.select();
    }
  }, [selectedLineIndex]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 8000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const generateLineId = () => `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

  const updateLine = useCallback((index: number, field: keyof StockOutLineItem, value: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity') {
        const qty = parseFloat(value) || 0;
        const stock = updated[index].current_stock;
        updated[index].warning = qty > stock ? `Qty exceeds stock (${stock})` : undefined;
      }
      return updated;
    });
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
    if (selectedLineIndex === index) setSelectedLineIndex(null);
    else if (selectedLineIndex !== null && selectedLineIndex > index) setSelectedLineIndex(selectedLineIndex - 1);
  }, [selectedLineIndex]);

  const handleQuantityKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const remarksInput = document.querySelector(`[data-remarks-index="${index}"]`) as HTMLInputElement;
      remarksInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  }, []);

  const handleRemarksKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      searchInput?.focus();
    } else if (e.key === 'Escape') {
      setSelectedLineIndex(null);
    }
  }, []);

  const validate = useCallback((): string | null => {
    if (lines.length === 0) return 'At least one item is required';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.quantity || parseFloat(line.quantity) <= 0) return `Line ${i + 1}: Quantity must be greater than 0`;
    }
    return null;
  }, [lines]);

  const hasNegativeItems = useCallback(() => {
    return lines.some((line) => {
      const qty = parseFloat(line.quantity) || 0;
      return qty > line.current_stock;
    });
  }, [lines]);

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (hasNegativeItems()) { setShowNegativeConfirm(true); setPendingSubmit(true); return; }
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
      setSuccess({ txn_no: result.transaction.txn_no, warnings: result.warnings });
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
                    <p className="font-semibold text-ok text-sm">Issue saved successfully!</p>
                    <p className="text-xs text-ok/70 mt-0.5">
                      Slip No: <span className="font-mono font-bold">{success.txn_no}</span>
                    </p>
                    {success.warnings.length > 0 && (
                      <div className="mt-1.5">
                        {success.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-low flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                            </svg>
                            {w.item_code}: {w.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleNewIssue}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-base bg-gradient-to-r from-accent to-accent-press rounded-xl hover:shadow-lg hover:shadow-accent/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
                  </svg>
                  New Issue
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
      <div className="p-5 border-b border-border-light">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Date */}
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Date *</label>
            <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <input
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none min-h-[44px] font-mono"
              />
            </div>
          </div>

          {/* Issued To (Person) */}
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Issued To</label>
            <div className="flex items-center border border-border rounded-xl focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div className="flex-1 min-h-[44px] flex items-center">
                <PersonSelect value={personId} onChange={setPersonId} />
              </div>
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Department</label>
            <div className="flex items-center border border-border rounded-xl focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <div className="flex-1 min-h-[44px] flex items-center">
                <DepartmentSelect value={departmentId} onChange={setDepartmentId} />
              </div>
            </div>
          </div>

          {/* Machine */}
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Machine</label>
            <div className="flex items-center border border-border rounded-xl focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-h-[44px] flex items-center">
                <MachineSelect departmentId={departmentId} value={machineId} onChange={setMachineId} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Purpose */}
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Purpose</label>
            <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all bg-transparent">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Why is this item being issued?"
                className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none min-h-[44px]"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
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
                className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none min-h-[44px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-text">Items</h3>
            {lines.length > 0 && (
              <span className="text-[10px] font-bold text-danger bg-danger-dim px-2.5 py-0.5 rounded-full border border-danger/15">
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
                <tr className="bg-gradient-to-r from-danger/5 via-transparent to-transparent border-b border-border-light">
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-8">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Item</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-20">Stock</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-24">Qty *</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-32">Remarks</th>
                  <th className="px-4 py-3 text-center font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {lines.map((line, index) => {
                  const isSelected = selectedLineIndex === index;
                  return (
                    <tr
                      key={line.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-accent-dim border-l-2 border-l-accent' :
                        line.warning ? 'bg-low-dim border-l-2 border-l-low' :
                        'hover:bg-hover odd:bg-elevated/20'
                      }`}
                    >
                      <td className="px-4 py-3 text-text-muted text-xs font-medium">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-accent font-medium">{line.item_code}</div>
                        <div className="text-sm text-text truncate max-w-xs">{line.item_name}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium ${line.current_stock <= 0 ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok'}`}>
                          {line.current_stock}
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
                          className={`w-full px-2 py-1.5 text-sm text-right border rounded-lg focus:ring-2 focus:ring-accent/25 focus:border-accent/40 font-mono bg-transparent outline-none transition-all ${
                            line.warning ? 'border-low bg-low-dim/30' : 'border-border'
                          }`}
                        />
                        {line.warning && (
                          <p className="text-[10px] text-low mt-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                            </svg>
                            {line.warning}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={line.line_remarks}
                          onChange={(e) => updateLine(index, 'line_remarks', e.target.value)}
                          onKeyDown={(e) => handleRemarksKeyDown(e, index)}
                          data-remarks-index={index}
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent/25 focus:border-accent/40 bg-transparent outline-none transition-all"
                        />
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
                  selectedLineIndex === index ? 'ring-2 ring-accent/30 border-accent/30' :
                  line.warning ? 'border-low/30' : 'border-border-light'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-accent font-medium">{line.item_code}</div>
                    <div className="text-sm text-text truncate">{line.item_name}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Stock: <span className={`font-mono font-medium ${line.current_stock <= 0 ? 'text-danger' : 'text-ok'}`}>{line.current_stock}</span> {line.unit}
                    </div>
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
                      className={`w-full px-3 py-2.5 text-base font-mono text-right border rounded-xl focus:ring-2 focus:ring-accent/25 focus:border-accent/40 min-h-[48px] bg-transparent outline-none transition-all ${
                        line.warning ? 'border-low bg-low-dim/30' : 'border-border'
                      }`}
                    />
                    {line.warning && (
                      <p className="text-[10px] text-low mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                        </svg>
                        {line.warning}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] block mb-1.5">Remarks</label>
                    <input
                      type="text"
                      value={line.line_remarks}
                      onChange={(e) => updateLine(index, 'line_remarks', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-accent/25 focus:border-accent/40 min-h-[48px] bg-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {lines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-2xl bg-danger-dim flex items-center justify-center mb-4 shadow-lg shadow-danger/10"
            >
              <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </motion.div>
            <p className="text-text-secondary font-medium text-sm">No items added yet</p>
            <p className="text-text-muted text-xs mt-1">Search above to add items to this issue</p>
          </div>
        )}
      </div>

      {/* Negative Stock Confirmation Dialog */}
      <AnimatePresence>
        {showNegativeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelNegativeConfirm} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative glass rounded-2xl border border-low/20 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-low/10 flex items-center justify-center mb-4 shadow-lg shadow-low/10">
                  <svg className="w-8 h-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-text mb-2">Stock Will Go Negative</h3>
                <p className="text-sm text-text-secondary mb-4">
                  The following items will have negative stock after this issue:
                </p>
                <div className="bg-low-dim/30 border border-low/15 rounded-xl p-3 mb-4 max-h-40 overflow-y-auto text-left">
                  {lines
                    .filter((line) => {
                      const qty = parseFloat(line.quantity) || 0;
                      return qty > line.current_stock;
                    })
                    .map((line, i) => (
                      <div key={i} className="flex justify-between text-sm py-1.5">
                        <span className="font-mono text-text font-medium">{line.item_code}</span>
                        <span className="text-low font-mono">
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
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-text border border-border rounded-xl hover:bg-hover min-h-[44px] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-low to-low/80 rounded-xl hover:shadow-lg hover:shadow-low/20 disabled:opacity-50 min-h-[44px] transition-all"
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
                        Yes, Save Anyway
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border-light bg-elevated/30 flex flex-col sm:flex-row justify-end gap-3">
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
          className="flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-danger to-danger/80 rounded-xl hover:shadow-lg hover:shadow-danger/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-all"
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
              Save Issue
            </>
          )}
        </button>
      </div>
    </div>
  );
}
