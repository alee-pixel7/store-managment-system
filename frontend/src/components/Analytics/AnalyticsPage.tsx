// AnalyticsPage Component
// Consumption trends, machine comparisons, dead stock, and stock value analytics

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  getConsumptionTrend,
  getMachineConsumption,
  getUnusualConsumption,
  getReorderInterval,
  getDeadStock,
  getStockValueTrend,
} from '../../api/analytics';
import { searchItems } from '../../api/transactions';
import type {
  ConsumptionTrend, MachineConsumption, UnusualConsumption,
  ReorderInterval, DeadStockItem, StockValueTrend,
} from '../../api/analytics';
import type { SearchItem } from '../../types';

type Tab = 'trend' | 'machines' | 'dead-stock' | 'reorder' | 'stock-value';

const formatCurrency = (v: number) => `₹${v.toLocaleString('en-IN')}`;

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stock-value');

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-text">Analytics</h1>
      </div>

      {/* Tabs */}
      <div className="bg-surface border-b border-border px-4">
        <div className="flex gap-1 overflow-x-auto">
          {([
            { id: 'stock-value' as Tab, label: 'Stock Value' },
            { id: 'trend' as Tab, label: 'Item Trend' },
            { id: 'machines' as Tab, label: 'Machines' },
            { id: 'dead-stock' as Tab, label: 'Dead Stock' },
            { id: 'reorder' as Tab, label: 'Reorder Interval' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'stock-value' && <StockValueSection />}
        {activeTab === 'trend' && <ConsumptionTrendSection />}
        {activeTab === 'machines' && <MachineConsumptionSection />}
        {activeTab === 'dead-stock' && <DeadStockSection />}
        {activeTab === 'reorder' && <ReorderIntervalSection />}
      </div>
    </div>
  );
}

// ============================================================
// STOCK VALUE TREND
// ============================================================
function StockValueSection() {
  const [data, setData] = useState<StockValueTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockValueTrend().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <Card title="Stock Value Trend (12 Months)">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Line type="monotone" dataKey="stockValue" name="Net Stock Value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="inValue" name="Total Inward" stroke="#16a34a" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="outValue" name="Total Outward" stroke="#dc2626" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ============================================================
// CONSUMPTION TREND PER ITEM
// ============================================================
function ConsumptionTrendSection() {
  const [itemId, setItemId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [data, setData] = useState<ConsumptionTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      searchItems(searchQuery).then(setSearchResults).catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    getConsumptionTrend(itemId).then(setData).finally(() => setLoading(false));
  }, [itemId]);

  const handleSelect = (item: SearchItem) => {
    setItemId(item.id);
    setSelectedItem({ code: item.item_code, name: item.item_name });
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      <Card title="Consumption Trend per Item">
        {/* Search */}
        <div className="mb-4 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an item..."
            className="w-full px-3 py-2.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent min-h-[44px]"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full px-3 py-2 text-left hover:bg-hover flex items-center justify-between min-h-[44px]"
                >
                  <div>
                    <span className="font-mono text-xs text-accent mr-2">{item.item_code}</span>
                    <span className="text-sm">{item.item_name}</span>
                  </div>
                  <span className="text-xs text-text-secondary">Stock: {item.current_stock}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="text-sm text-text-secondary mb-3">
            <span className="font-mono text-accent">{selectedItem.code}</span> — {selectedItem.name}
          </div>
        )}

        {loading && <Loading />}

        {!loading && itemId && data.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="quantity" name="Quantity Consumed" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {!loading && itemId && data.length === 0 && (
          <div className="text-center py-8 text-text-secondary text-sm">No consumption data for this item</div>
        )}

        {!itemId && (
          <div className="text-center py-8 text-text-secondary text-sm">Select an item to view its consumption trend</div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// MACHINE-WISE CONSUMPTION + UNUSUAL FLAGS
// ============================================================
function MachineConsumptionSection() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<MachineConsumption[]>([]);
  const [unusual, setUnusual] = useState<UnusualConsumption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMachineConsumption(year, month),
      getUnusualConsumption(),
    ]).then(([machines, flags]) => {
      setData(machines);
      setUnusual(flags);
    }).finally(() => setLoading(false));
  }, [year, month]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <Card title="Machine-wise Consumption">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-border rounded min-h-[44px]"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-border rounded min-h-[44px]"
          >
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {loading ? <Loading /> : (
          <>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="machineName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number, name: string) => name === 'Value' ? formatCurrency(v) : v} />
                  <Legend />
                  <Bar dataKey="totalQty" name="Quantity" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalValue" name="Value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-text-secondary text-sm">No machine consumption data for this month</div>
            )}
          </>
        )}
      </Card>

      {/* Unusual Consumption Flags */}
      <Card title="Unusual Consumption — Worth Checking" titleColor="text-red-600">
        {unusual.length === 0 ? (
          <div className="text-center py-6 text-text-secondary text-sm">No unusual consumption detected this month</div>
        ) : (
          <div className="space-y-3">
            {unusual.map((flag) => (
              <div key={flag.machineId} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-text">{flag.machineName}</div>
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded">
                    +{flag.percentAbove}% above average
                  </span>
                </div>
                <div className="text-sm text-text-secondary mb-2">
                  Current: <span className="font-mono font-medium">{flag.currentMonthQty}</span> pcs
                  {' · '}6-month avg: <span className="font-mono">{flag.sixMonthAvgQty}</span> pcs/month
                </div>
                <div className="text-xs text-text-secondary">
                  Top items: {flag.topItems.map((ti) => `${ti.itemCode} (${ti.qty})`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// DEAD STOCK REPORT
// ============================================================
function DeadStockSection() {
  const [data, setData] = useState<DeadStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '90days' | '180days' | '365days'>('all');

  useEffect(() => {
    getDeadStock().then(setData).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? data : data.filter(d => d.deadCategory === filter);
  const totalValue = filtered.reduce((sum, d) => sum + d.tiedUpValue, 0);

  const counts = {
    '90days': data.filter(d => d.deadCategory === '90days').length,
    '180days': data.filter(d => d.deadCategory === '180days').length,
    '365days': data.filter(d => d.deadCategory === '365days').length,
  };

  const badge = (cat: string) => {
    const base = 'px-2 py-0.5 text-xs font-medium rounded';
    switch (cat) {
      case '90days': return <span className={`${base} bg-amber-100 text-amber-700`}>90+ days</span>;
      case '180days': return <span className={`${base} bg-orange-100 text-orange-700`}>180+ days</span>;
      case '365days': return <span className={`${base} bg-red-100 text-red-700`}>365+ days</span>;
      default: return <span className={`${base} bg-green-100 text-green-700`}>Active</span>;
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Dead Stock Report">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <button onClick={() => setFilter('90days')} className={`p-3 rounded-lg text-center border ${filter === '90days' ? 'border-amber-400 bg-amber-50' : 'border-border bg-elevated'}`}>
            <div className="text-2xl font-bold text-amber-600">{counts['90days']}</div>
            <div className="text-xs text-text-secondary">90+ days</div>
          </button>
          <button onClick={() => setFilter('180days')} className={`p-3 rounded-lg text-center border ${filter === '180days' ? 'border-orange-400 bg-orange-50' : 'border-border bg-elevated'}`}>
            <div className="text-2xl font-bold text-orange-600">{counts['180days']}</div>
            <div className="text-xs text-text-secondary">180+ days</div>
          </button>
          <button onClick={() => setFilter('365days')} className={`p-3 rounded-lg text-center border ${filter === '365days' ? 'border-red-400 bg-red-50' : 'border-border bg-elevated'}`}>
            <div className="text-2xl font-bold text-red-600">{counts['365days']}</div>
            <div className="text-xs text-text-secondary">365+ days</div>
          </button>
          <div className="p-3 rounded-lg text-center border border-border bg-elevated">
            <div className="text-2xl font-bold text-text">{filtered.length}</div>
            <div className="text-xs text-text-secondary">Total shown</div>
          </div>
        </div>

        <div className="text-sm text-text-secondary mb-3">
          Tied-up value: <span className="font-semibold">{formatCurrency(totalValue)}</span>
        </div>

        {loading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-elevated border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Stock</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Rate</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Tied Value</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Last Movement</th>
                  <th className="px-3 py-2 text-center font-medium text-text-secondary">Days</th>
                  <th className="px-3 py-2 text-center font-medium text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.itemId} className="hover:bg-hover">
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs text-accent">{item.itemCode}</div>
                      <div className="text-text truncate max-w-[200px]">{item.itemName}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{item.currentStock} {item.unit}</td>
                    <td className="px-3 py-2 text-right font-mono">{item.lastRate ? formatCurrency(item.lastRate) : '-'}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(item.tiedUpValue)}</td>
                    <td className="px-3 py-2 text-text-secondary">{item.lastMovementDate || 'Never'}</td>
                    <td className="px-3 py-2 text-center font-mono">{item.daysSinceMovement ?? '-'}</td>
                    <td className="px-3 py-2 text-center">{badge(item.deadCategory)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-text-secondary">No dead stock items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// REORDER INTERVAL
// ============================================================
function ReorderIntervalSection() {
  const [data, setData] = useState<ReorderInterval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReorderInterval().then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <Card title="Average Days Between Reorders">
        <p className="text-sm text-text-secondary mb-3">Items sorted by reorder frequency (shortest interval first)</p>

        {loading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-elevated border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Item</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Stock</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Avg Days</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Reorders</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Last Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((item) => (
                  <tr key={item.itemId} className="hover:bg-hover">
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs text-accent">{item.itemCode}</div>
                      <div className="text-text truncate max-w-[200px]">{item.itemName}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{item.currentStock} {item.unit}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-mono font-medium ${
                        item.avgDaysBetweenReorders && item.avgDaysBetweenReorders < 30 ? 'text-red-600' :
                        item.avgDaysBetweenReorders && item.avgDaysBetweenReorders < 60 ? 'text-amber-600' :
                        'text-text'
                      }`}>
                        {item.avgDaysBetweenReorders ?? '-'}
                      </span>
                      {item.avgDaysBetweenReorders && <span className="text-xs text-text-secondary ml-1">days</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-text-secondary">{item.totalReorders}</td>
                    <td className="px-3 py-2 text-text-secondary">{item.lastReceivedDate || '-'}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-text-secondary">Not enough reorder data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Card({ title, titleColor, children }: { title: string; titleColor?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-lg shadow">
      <div className="px-4 py-3 border-b border-border">
        <h2 className={`text-base font-semibold ${titleColor || 'text-text'}`}>{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Loading() {
  return <div className="text-center py-8 text-text-secondary text-sm">Loading...</div>;
}
