// MonthlyReportPage Component
// Monthly report with month/year picker, summary cards, and sortable tables

import { useState, useMemo } from 'react';
import { getMonthlyReport } from '../../api/reports';
import { downloadExport } from '../../api/export';
import { formatDateTime } from '../../lib/dates';
import { Dropdown } from '../ui/Dropdown';
import type { MonthlyReport } from '../../api/reports';

type SortField = 'department' | 'machine' | 'totalQty' | 'totalValue' | 'items';
type SortDirection = 'asc' | 'desc';

export function MonthlyReportPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  // Sort state for department table
  const [deptSortField, setDeptSortField] = useState<SortField>('totalValue');
  const [deptSortDir, setDeptSortDir] = useState<SortDirection>('desc');

  // Sort state for machine table
  const [machSortField, setMachSortField] = useState<SortField>('totalValue');
  const [machSortDir, setMachSortDir] = useState<SortDirection>('desc');

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMonthlyReport(selectedYear, selectedMonth);
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
      await downloadExport('monthly', { year: String(selectedYear), month: String(selectedMonth) }, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDeptSort = (field: SortField) => {
    if (deptSortField === field) {
      setDeptSortDir(deptSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setDeptSortField(field);
      setDeptSortDir('desc');
    }
  };

  const handleMachSort = (field: SortField) => {
    if (machSortField === field) {
      setMachSortDir(machSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setMachSortField(field);
      setMachSortDir('desc');
    }
  };

  const sortedDepts = useMemo(() => {
    if (!report) return [];
    const sorted = [...report.departmentConsumption].sort((a, b) => {
      const ra = a as unknown as Record<string, string | number>;
      const rb = b as unknown as Record<string, string | number>;
      const aVal = ra[deptSortField];
      const bVal = rb[deptSortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return deptSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return deptSortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [report, deptSortField, deptSortDir]);

  const sortedMachines = useMemo(() => {
    if (!report) return [];
    const sorted = [...report.machineConsumption].sort((a, b) => {
      const aVal = a[machSortField];
      const bVal = b[machSortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return machSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return machSortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [report, machSortField, machSortDir]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const SortIcon = ({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) => {
    if (field !== currentField) return <span className="text-text-muted ml-1">↕</span>;
    return <span className="text-accent ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="min-h-screen bg-base print:bg-surface">
      {/* Header - Hidden in print */}
      <div className="bg-surface border-b border-border px-4 py-3 print:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text">Monthly Report</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Month:</label>
              <Dropdown
                options={months.map((name, index) => ({ value: index + 1, label: name }))}
                value={selectedMonth}
                onChange={(v) => setSelectedMonth(Number(v))}
                className="w-28"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Year:</label>
              <Dropdown
                options={Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map((year) => ({ value: year, label: String(year) }))}
                value={selectedYear}
                onChange={(v) => setSelectedYear(Number(v))}
                className="w-24"
              />
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="btn btn-primary btn-sm disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            {report && (
              <>
                <button
                  onClick={() => handleExport('excel')}
                  disabled={exporting === 'excel'}
                  className="btn btn-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting === 'excel' ? 'Exporting...' : 'Excel'}
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting === 'pdf'}
                  className="btn btn-danger btn-sm disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                </button>
                <button
                  onClick={handlePrint}
                  className="btn btn-ghost btn-sm"
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
          <div className="max-w-6xl mx-auto bg-surface print:bg-surface print:shadow-none shadow rounded-lg print:rounded-none">
            {/* Print Header */}
            <div className="hidden print:block print:mb-6">
              <h1 className="text-2xl font-bold text-center mb-1">Monthly Stock Report</h1>
              <p className="text-center text-text-secondary">{report.monthName} {report.year}</p>
              <p className="text-center text-sm text-text-secondary mt-1">
                Generated on: {formatDateTime(new Date())}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="p-4 border-b border-border print:border-border">
              <h2 className="text-lg font-semibold text-text mb-3">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-accent-dim print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Total Received</div>
                  <div className="text-xl font-bold text-accent">{report.summary.totalReceived}</div>
                  <div className="text-xs text-text-secondary">{formatCurrency(report.summary.totalReceivedValue)}</div>
                </div>
                <div className="bg-orange-50 print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Total Issued</div>
                  <div className="text-xl font-bold text-orange-700">{report.summary.totalIssued}</div>
                  <div className="text-xs text-text-secondary">{formatCurrency(report.summary.totalIssuedValue)}</div>
                </div>
                <div className="bg-green-50 print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Total Returned</div>
                  <div className="text-xl font-bold text-green-700">{report.summary.totalReturned}</div>
                  <div className="text-xs text-text-secondary">{formatCurrency(report.summary.totalReturnedValue)}</div>
                </div>
                <div className="bg-purple-50 print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Transactions</div>
                  <div className="text-xl font-bold text-purple-700">{report.summary.totalTransactions}</div>
                </div>
              </div>

              {/* Stock Value */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-elevated print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Opening Stock Value</div>
                  <div className="text-lg font-bold text-text">{formatCurrency(report.stockValue.opening)}</div>
                </div>
                <div className="bg-elevated print:bg-base p-3 rounded">
                  <div className="text-sm text-text-secondary">Closing Stock Value</div>
                  <div className="text-lg font-bold text-text">{formatCurrency(report.stockValue.closing)}</div>
                </div>
              </div>
            </div>

            {/* Department Consumption */}
            {report.departmentConsumption.length > 0 && (
              <div className="p-4 border-b border-border print:border-border">
                <h2 className="text-lg font-semibold text-text mb-3">Department-wise Consumption</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-elevated print:bg-base">
                        <th
                          className="px-3 py-2 text-left font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleDeptSort('department')}
                        >
                          Department <SortIcon field="department" currentField={deptSortField} direction={deptSortDir} />
                        </th>
                        <th
                          className="px-3 py-2 text-right font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleDeptSort('totalQty')}
                        >
                          Qty <SortIcon field="totalQty" currentField={deptSortField} direction={deptSortDir} />
                        </th>
                        <th
                          className="px-3 py-2 text-right font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleDeptSort('totalValue')}
                        >
                          Value <SortIcon field="totalValue" currentField={deptSortField} direction={deptSortDir} />
                        </th>
                        <th
                          className="px-3 py-2 text-right font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleDeptSort('items')}
                        >
                          Items <SortIcon field="items" currentField={deptSortField} direction={deptSortDir} />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedDepts.map((dept) => (
                        <tr key={dept.department} className="hover:bg-hover">
                          <td className="px-3 py-2 font-medium text-text">{dept.department}</td>
                          <td className="px-3 py-2 text-right">{dept.totalQty}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(dept.totalValue)}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{dept.items}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Machine Consumption */}
            {report.machineConsumption.length > 0 && (
              <div className="p-4 border-b border-border print:border-border">
                <h2 className="text-lg font-semibold text-text mb-3">Machine-wise Consumption</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-elevated print:bg-base">
                        <th
                          className="px-3 py-2 text-left font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleMachSort('machine')}
                        >
                          Machine <SortIcon field="machine" currentField={machSortField} direction={machSortDir} />
                        </th>
                        <th
                          className="px-3 py-2 text-left font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleMachSort('department')}
                        >
                          Department <SortIcon field="department" currentField={machSortField} direction={machSortDir} />
                        </th>
                        <th
                          className="px-3 py-2 text-right font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleMachSort('totalQty')}
                        >
                          Qty <SortIcon field="totalQty" currentField={machSortField} direction={machSortDir} />
                        </th>
                        <th
                          className="px-3 py-2 text-right font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleMachSort('totalValue')}
                        >
                          Value <SortIcon field="totalValue" currentField={machSortField} direction={machSortDir} />
                        </th>
                        <th
                          className="px-3 py-2 text-right font-medium text-text-secondary cursor-pointer hover:bg-hover"
                          onClick={() => handleMachSort('items')}
                        >
                          Items <SortIcon field="items" currentField={machSortField} direction={machSortDir} />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedMachines.map((mach) => (
                        <tr key={mach.machine} className="hover:bg-hover">
                          <td className="px-3 py-2 font-mono text-text">{mach.machine}</td>
                          <td className="px-3 py-2 text-text-secondary">{mach.department || '-'}</td>
                          <td className="px-3 py-2 text-right">{mach.totalQty}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(mach.totalValue)}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{mach.items}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top 20 Consumed Items */}
            {report.topConsumedItems.length > 0 && (
              <div className="p-4 border-b border-border print:border-border">
                <h2 className="text-lg font-semibold text-text mb-3">Top 20 Most Consumed Items</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-elevated print:bg-base">
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">#</th>
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Received</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Issued</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Net</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.topConsumedItems.map((item, index) => (
                        <tr key={item.itemCode} className="hover:bg-hover">
                          <td className="px-3 py-2 text-text-secondary">{index + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs text-accent">{item.itemCode}</div>
                            <div className="text-text">{item.itemName}</div>
                            {item.brand && (
                              <div className="text-xs text-text-secondary">{item.brand}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-green-600">{item.totalReceived}</td>
                          <td className="px-3 py-2 text-right text-orange-600">{item.totalIssued}</td>
                          <td className="px-3 py-2 text-right font-medium text-red-600">{item.netConsumption}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.estimatedValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Out of Stock Items */}
            {report.outOfStockItems.length > 0 && (
              <div className="p-4 border-b border-border print:border-border">
                <h2 className="text-lg font-semibold text-red-700 mb-3">
                  Items Out of Stock During Month
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-red-50 print:bg-base">
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Min Stock</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Days Out of Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.outOfStockItems.map((item) => (
                        <tr key={item.itemCode} className="hover:bg-red-50">
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs text-accent">{item.itemCode}</div>
                            <div className="text-text">{item.itemName}</div>
                            {item.brand && (
                              <div className="text-xs text-text-secondary">{item.brand}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-text-secondary">
                            {item.minStock} {item.unit}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-red-600">
                            {item.daysOutOfStock} days
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {report.departmentConsumption.length === 0 &&
             report.machineConsumption.length === 0 &&
             report.topConsumedItems.length === 0 && (
              <div className="p-8 text-center text-text-secondary">
                No transactions found for this month.
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
          Select a month and year, then click "Generate Report" to view the monthly report.
        </div>
      )}
    </div>
  );
}
