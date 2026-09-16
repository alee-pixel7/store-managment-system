// DailyReportPage Component
// Daily report with date picker, printable layout, and print stylesheet

import { useState } from 'react';
import { getDailyReport } from '../../api/reports';
import { downloadExport } from '../../api/export';
import type { DailyReport } from '../../api/reports';

export function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

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

  return (
    <div className="min-h-screen bg-base print:bg-surface">
      {/* Header - Hidden in print */}
      <div className="bg-surface border-b border-border px-4 py-3 print:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text">Daily Report</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-4 py-1.5 text-sm font-medium text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            {report && (
              <>
                <button
                  onClick={() => handleExport('excel')}
                  disabled={exporting === 'excel'}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting === 'excel' ? 'Exporting...' : 'Excel'}
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting === 'pdf'}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 text-sm font-medium text-text bg-elevated border border-border rounded hover:bg-hover flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm print:hidden">
          {error}
        </div>
      )}

      {/* Report Content */}
      {report && (
        <div className="p-4 print:p-0">
          <div className="max-w-4xl mx-auto bg-surface print:bg-surface print:shadow-none shadow rounded-lg print:rounded-none">
            {/* Print Header */}
            <div className="hidden print:block print:mb-6">
              <h1 className="text-2xl font-bold text-center mb-1">Daily Stock Report</h1>
              <p className="text-center text-text-secondary">{formatDate(report.date)}</p>
              <p className="text-center text-sm text-text-secondary mt-1">
                Generated on: {new Date().toLocaleString('en-IN')}
              </p>
            </div>

            {/* Summary Section */}
            <div className="p-4 border-b border-border print:border-border">
              <h2 className="text-lg font-semibold text-text mb-3">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-accent-dim print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Total Receipts</div>
                  <div className="text-xl font-bold text-accent">{report.summary.totalReceipts}</div>
                  <div className="text-xs text-text-secondary">{report.summary.totalReceiptQty} pcs</div>
                </div>
                <div className="bg-orange-50 print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Total Issues</div>
                  <div className="text-xl font-bold text-orange-700">{report.summary.totalIssues}</div>
                  <div className="text-xs text-text-secondary">{report.summary.totalIssueQty} pcs</div>
                </div>
                <div className="bg-green-50 print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Total Returns</div>
                  <div className="text-xl font-bold text-green-700">{report.summary.totalReturns}</div>
                  <div className="text-xs text-text-secondary">{report.summary.totalReturnQty} pcs</div>
                </div>
                <div className="bg-purple-50 print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Total Transactions</div>
                  <div className="text-xl font-bold text-purple-700">{report.summary.totalTransactions}</div>
                </div>
              </div>
            </div>

            {/* Receipts Section */}
            {report.receipts.length > 0 && (
              <div className="p-4 border-b border-border print:border-border">
                <h2 className="text-lg font-semibold text-text mb-3">Receipts (Stock IN)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-elevated print:bg-base">
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Qty</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Rate</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Total</th>
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Supplier</th>
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.receipts.map((receipt, index) => (
                        <tr key={index} className="hover:bg-hover">
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs text-accent">{receipt.itemCode}</div>
                            <div className="text-text">{receipt.itemName}</div>
                            {receipt.brand && (
                              <div className="text-xs text-text-secondary">{receipt.brand}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{receipt.qty}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(receipt.rate)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(receipt.total)}</td>
                          <td className="px-3 py-2 text-text-secondary">{receipt.supplier}</td>
                          <td className="px-3 py-2 text-text-secondary">{receipt.invoiceNo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Issues Section */}
            {report.issues.length > 0 && (
              <div className="p-4 border-b border-border print:border-border">
                <h2 className="text-lg font-semibold text-text mb-3">Issues (Stock OUT)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-elevated print:bg-base">
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Qty</th>
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Issued To</th>
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Dept</th>
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Machine</th>
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.issues.map((issue, index) => (
                        <tr key={index} className="hover:bg-hover">
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs text-accent">{issue.itemCode}</div>
                            <div className="text-text">{issue.itemName}</div>
                            {issue.brand && (
                              <div className="text-xs text-text-secondary">{issue.brand}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{issue.qty}</td>
                          <td className="px-3 py-2 text-text-secondary">{issue.issuedTo}</td>
                          <td className="px-3 py-2 text-text-secondary">{issue.department || '-'}</td>
                          <td className="px-3 py-2 text-text-secondary">{issue.machine || '-'}</td>
                          <td className="px-3 py-2 text-text-secondary">{issue.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Items Below Minimum Section */}
            {report.itemsBelowMinimum.length > 0 && (
              <div className="p-4 border-b border-border print:border-border">
                <h2 className="text-lg font-semibold text-red-700 mb-3">
                  Items Crossed Below Minimum Stock
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-red-50 print:bg-base">
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Current Stock</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Minimum Stock</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Deficit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.itemsBelowMinimum.map((item, index) => (
                        <tr key={index} className="hover:bg-red-50">
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs text-accent">{item.itemCode}</div>
                            <div className="text-text">{item.itemName}</div>
                            {item.brand && (
                              <div className="text-xs text-text-secondary">{item.brand}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-red-600">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="px-3 py-2 text-right text-text-secondary">
                            {item.minStock} {item.unit}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-red-700">
                            {item.minStock - item.currentStock} {item.unit}
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
              <div className="p-8 text-center text-text-secondary">
                No transactions found for this date.
              </div>
            )}

            {/* Print Footer */}
            <div className="hidden print:block print:mt-8 print:border-t print:border-border print:pt-4">
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
        <div className="p-8 text-center text-text-secondary print:hidden">
          Select a date and click "Generate Report" to view the daily report.
        </div>
      )}
    </div>
  );
}
