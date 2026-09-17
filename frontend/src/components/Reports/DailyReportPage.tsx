import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDailyReport } from '../../api/reports';
import { reverseTransactionByNo } from '../../api/transactions';
import { downloadExport } from '../../api/export';
import type { DailyReport } from '../../api/reports';

interface ReverseTarget {
  txnNo: string;
  type: 'receipt' | 'issue';
}

export function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [reverseTarget, setReverseTarget] = useState<ReverseTarget | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const [reverseSuccess, setReverseSuccess] = useState<string | null>(null);
  const [negativeStockWarning, setNegativeStockWarning] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyReport(selectedDate);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      await downloadExport('daily', { date: selectedDate }, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleReverse = async (force: boolean = false) => {
    if (!reverseTarget || !reverseReason.trim()) return;
    const target = reverseTarget;
    setReversing(true);
    try {
      await reverseTransactionByNo(target.txnNo, reverseReason.trim(), force);
      setReverseTarget(null);
      setNegativeStockWarning(null);
      setReverseReason('');
      setReverseSuccess(`Transaction ${target.txnNo} reversed successfully`);
      await handleGenerateReport();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reverse transaction';
      if (msg.includes('negative stock') && !force) {
        setNegativeStockWarning(msg);
      } else {
        setReverseTarget(null);
        setNegativeStockWarning(null);
        setReverseReason('');
        setError(msg);
      }
    } finally {
      setReversing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Group transactions by txnNo for reverse
  const groupedReceipts = report?.receipts.reduce((acc, r) => {
    if (!acc[r.txnNo]) acc[r.txnNo] = { ...r, totalQty: r.qty, totalAmount: r.total, items: [r] };
    else { acc[r.txnNo].totalQty += r.qty; acc[r.txnNo].totalAmount += r.total; acc[r.txnNo].items.push(r); }
    return acc;
  }, {} as Record<string, any>) || {};

  const groupedIssues = report?.issues.reduce((acc, i) => {
    if (!acc[i.txnNo]) acc[i.txnNo] = { ...i, totalQty: i.qty, items: [i] };
    else { acc[i.txnNo].totalQty += i.qty; acc[i.txnNo].items.push(i); }
    return acc;
  }, {} as Record<string, any>) || {};

  return (
    <div className="min-h-screen bg-base print:bg-surface">
      {/* Header - Hidden in print */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 print:hidden">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shadow-lg shadow-accent/10">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text tracking-tight">Daily Report</h1>
            <p className="text-sm text-text-secondary">View and export daily transaction summaries</p>
          </div>
        </motion.div>

        {/* Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass rounded-2xl border border-border-light p-4 mb-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/40 transition-all">
              <div className="px-3 py-2.5 bg-elevated/50 flex items-center justify-center border-r border-border">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2.5 text-sm bg-transparent outline-none min-h-[44px] font-mono"
              />
            </div>

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerateReport}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-base bg-gradient-to-r from-accent to-accent-press rounded-xl hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 min-h-[44px] transition-all"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {loading ? 'Generating...' : 'Generate Report'}
            </motion.button>

            <div className="h-6 w-px bg-border-light hidden sm:block" />

            {/* Export Buttons */}
            {report && (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleExport('excel')}
                  disabled={exporting === 'excel'}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ok bg-ok/10 border border-ok/20 rounded-xl hover:bg-ok/20 disabled:opacity-50 min-h-[44px] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {exporting === 'excel' ? 'Exporting...' : 'Excel'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleExport('pdf')}
                  disabled={exporting === 'pdf'}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-danger bg-danger/10 border border-danger/20 rounded-xl hover:bg-danger/20 disabled:opacity-50 min-h-[44px] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-hover min-h-[44px] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                  </svg>
                  Print
                </motion.button>
              </>
            )}
          </div>
        </motion.div>

        {/* Success Toast */}
        <AnimatePresence>
          {reverseSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 glass rounded-xl border border-ok/15 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-ok/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-ok font-medium">{reverseSuccess}</span>
              </div>
              <button onClick={() => setReverseSuccess(null)} className="p-2 text-ok/60 hover:text-ok rounded-lg hover:bg-ok/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 glass rounded-xl border border-danger/15 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-danger/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <span className="text-sm text-danger font-medium">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="p-2 text-danger/60 hover:text-danger rounded-lg hover:bg-danger/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Report Content */}
      {report && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-6 print:p-0">
          <div className="bg-surface print:bg-surface print:shadow-none shadow-xl rounded-2xl border border-border-light print:rounded-none print:border-none overflow-hidden">
            {/* Print Header */}
            <div className="hidden print:block print:mb-6 p-6">
              <h1 className="text-2xl font-bold text-center mb-1">Daily Stock Report</h1>
              <p className="text-center text-text-secondary">{formatDate(report.date)}</p>
              <p className="text-center text-sm text-text-secondary mt-1">
                Generated on: {new Date().toLocaleString('en-IN')}
              </p>
            </div>

            {/* Summary Section */}
            <div className="p-5 border-b border-border-light print:border-border">
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em] mb-4">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Receipts */}
                <div className="glass rounded-xl gradient-border-left-ok p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Receipts</span>
                    <div className="w-8 h-8 rounded-lg bg-ok/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-ok">{report.summary.totalReceipts}</div>
                  <div className="text-xs text-text-muted mt-1">{report.summary.totalReceiptQty} pcs</div>
                </div>

                {/* Issues */}
                <div className="glass rounded-xl gradient-border-left-danger p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Issues</span>
                    <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-danger">{report.summary.totalIssues}</div>
                  <div className="text-xs text-text-muted mt-1">{report.summary.totalIssueQty} pcs</div>
                </div>

                {/* Returns */}
                <div className="glass rounded-xl gradient-border-left-accent p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Returns</span>
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-accent">{report.summary.totalReturns}</div>
                  <div className="text-xs text-text-muted mt-1">{report.summary.totalReturnQty} pcs</div>
                </div>

                {/* Total */}
                <div className="glass rounded-xl gradient-border-left-purple p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Total</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{report.summary.totalTransactions}</div>
                  <div className="text-xs text-text-muted mt-1">all types</div>
                </div>
              </div>
            </div>

            {/* Receipts Section */}
            {Object.keys(groupedReceipts).length > 0 && (
              <div className="p-5 border-b border-border-light print:border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-ok/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
                      </svg>
                    </div>
                    <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">Receipts (Stock IN)</h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-ok/5 via-transparent to-transparent border-b border-border-light">
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Item</th>
                        <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Qty</th>
                        <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Rate</th>
                        <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Total</th>
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Supplier</th>
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Invoice</th>
                        <th className="px-4 py-3 text-center font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {report.receipts.map((receipt) => (
                        <tr key={receipt.txnNo} className="hover:bg-hover odd:bg-elevated/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs text-accent font-medium">{receipt.itemCode}</div>
                            <div className="text-sm text-text truncate max-w-xs">{receipt.itemName}</div>
                            {receipt.brand && <div className="text-[11px] text-text-muted">{receipt.brand}</div>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-text">{receipt.qty}</td>
                          <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatCurrency(receipt.rate)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-text">{formatCurrency(receipt.total)}</td>
                          <td className="px-4 py-3 text-text-secondary text-sm">{receipt.supplier}</td>
                          <td className="px-4 py-3 text-text-secondary text-sm font-mono">{receipt.invoiceNo}</td>
                          <td className="px-4 py-3 text-center print:hidden">
                            <button
                              onClick={() => setReverseTarget({ txnNo: receipt.txnNo, type: 'receipt' })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-low bg-low/10 border border-low/20 rounded-lg hover:bg-low/20 transition-all"
                              title="Reverse this transaction"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                              </svg>
                              Reverse
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Issues Section */}
            {Object.keys(groupedIssues).length > 0 && (
              <div className="p-5 border-b border-border-light print:border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </div>
                    <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">Issues (Stock OUT)</h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-danger/5 via-transparent to-transparent border-b border-border-light">
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Item</th>
                        <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Qty</th>
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Issued To</th>
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Dept</th>
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Machine</th>
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Purpose</th>
                        <th className="px-4 py-3 text-center font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em] print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {report.issues.map((issue) => (
                        <tr key={issue.txnNo} className="hover:bg-hover odd:bg-elevated/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs text-accent font-medium">{issue.itemCode}</div>
                            <div className="text-sm text-text truncate max-w-xs">{issue.itemName}</div>
                            {issue.brand && <div className="text-[11px] text-text-muted">{issue.brand}</div>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-text">{issue.qty}</td>
                          <td className="px-4 py-3 text-text-secondary text-sm">{issue.issuedTo}</td>
                          <td className="px-4 py-3 text-text-secondary text-sm">{issue.department || '-'}</td>
                          <td className="px-4 py-3 text-text-secondary text-sm">{issue.machine || '-'}</td>
                          <td className="px-4 py-3 text-text-secondary text-sm max-w-[200px] truncate">{issue.purpose}</td>
                          <td className="px-4 py-3 text-center print:hidden">
                            <button
                              onClick={() => setReverseTarget({ txnNo: issue.txnNo, type: 'issue' })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-low bg-low/10 border border-low/20 rounded-lg hover:bg-low/20 transition-all"
                              title="Reverse this transaction"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                              </svg>
                              Reverse
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Items Below Minimum Section */}
            {report.itemsBelowMinimum.length > 0 && (
              <div className="p-5 border-b border-border-light print:border-border">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h2 className="text-xs font-semibold text-danger uppercase tracking-[0.12em]">Items Crossed Below Minimum</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-danger/5 via-transparent to-transparent border-b border-border-light">
                        <th className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Item</th>
                        <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Current</th>
                        <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Minimum</th>
                        <th className="px-4 py-3 text-right font-semibold text-text-secondary text-[10px] uppercase tracking-[0.1em]">Deficit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {report.itemsBelowMinimum.map((item) => (
                        <tr key={item.itemCode} className="hover:bg-danger/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs text-accent font-medium">{item.itemCode}</div>
                            <div className="text-sm text-text">{item.itemName}</div>
                            {item.brand && <div className="text-[11px] text-text-muted">{item.brand}</div>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-danger/10 text-danger">
                              {item.currentStock} {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-text-secondary text-sm">{item.minStock} {item.unit}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono font-bold text-danger">{item.minStock - item.currentStock} {item.unit}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {report.receipts.length === 0 && report.issues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-2xl bg-elevated flex items-center justify-center mb-5"
                >
                  <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </motion.div>
                <p className="text-text-secondary font-medium">No transactions found</p>
                <p className="text-text-muted text-sm mt-1">No stock movements recorded for this date</p>
              </div>
            )}

            {/* Print Footer */}
            <div className="hidden print:block print:mt-8 print:border-t print:border-border print:pt-4 px-6 pb-4">
              <div className="flex justify-between text-sm text-text-secondary">
                <div>Store Management System</div>
                <div>Page 1 of 1</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - No Report Generated */}
      {!report && !loading && !error && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 print:hidden">
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-2xl bg-accent-dim flex items-center justify-center mb-5 shadow-lg shadow-accent/10"
            >
              <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </motion.div>
            <p className="text-text-secondary font-medium">Select a date and generate report</p>
            <p className="text-text-muted text-sm mt-1">Choose a date above to view daily transactions</p>
          </div>
        </div>
      )}

      {/* Reverse Confirmation Dialog */}
      <AnimatePresence>
        {reverseTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setReverseTarget(null); setReverseReason(''); }} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative glass rounded-2xl border border-low/20 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-low/10 flex items-center justify-center shadow-lg shadow-low/10">
                    <svg className="w-6 h-6 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text">Reverse Transaction</h3>
                    <p className="text-sm text-text-secondary">{reverseTarget.txnNo}</p>
                  </div>
                </div>

                <p className="text-sm text-text-secondary mb-4">
                  This will create a correction entry for <span className="font-mono font-semibold text-text">{reverseTarget.txnNo}</span>. The original transaction will be marked as reversed.
                </p>

                <div className="mb-4">
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] mb-1.5">Reason *</label>
                  <textarea
                    value={reverseReason}
                    onChange={(e) => setReverseReason(e.target.value)}
                    placeholder="Why is this transaction being reversed?"
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-accent/25 focus:border-accent/40 bg-transparent outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setReverseTarget(null); setReverseReason(''); }}
                    className="px-5 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-hover min-h-[44px] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReverse}
                    disabled={reversing || !reverseReason.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-low to-low/80 rounded-xl hover:shadow-lg hover:shadow-low/20 disabled:opacity-50 min-h-[44px] transition-all"
                  >
                    {reversing ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                    )}
                    {reversing ? 'Reversing...' : 'Yes, Reverse'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {negativeStockWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setNegativeStockWarning(null); setReverseTarget(null); setReverseReason(''); }} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative glass rounded-2xl border border-danger/20 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center shadow-lg shadow-danger/10">
                    <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-danger">Negative Stock Warning</h3>
                    <p className="text-sm text-text-secondary">{reverseTarget?.txnNo}</p>
                  </div>
                </div>

                <p className="text-sm text-text-secondary mb-4">
                  {negativeStockWarning}. This will allow stock to go negative. Are you sure you want to continue?
                </p>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setNegativeStockWarning(null); setReverseTarget(null); setReverseReason(''); }}
                    className="px-5 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-hover min-h-[44px] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReverse(true)}
                    disabled={reversing}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-danger to-danger/80 rounded-xl hover:shadow-lg hover:shadow-danger/20 disabled:opacity-50 min-h-[44px] transition-all"
                  >
                    {reversing ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    )}
                    {reversing ? 'Force Reversing...' : 'Force Reverse'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
