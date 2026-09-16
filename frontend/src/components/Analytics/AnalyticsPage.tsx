// AnalyticsPage — Premium dark industrial design

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const tabs = [
  { id: 'stock-value' as Tab, label: 'Stock Value', icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941' },
  { id: 'trend' as Tab, label: 'Item Trend', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5' },
  { id: 'machines' as Tab, label: 'Machines', icon: 'M11.42 15.17l-5.384 3.18A1.125 1.125 0 014.5 17.29V5.71a1.125 1.125 0 011.536-1.06l5.384 3.18m0 0l5.384 3.18A1.125 1.125 0 0118 12.29V.71a1.125 1.125 0 00-1.536-1.06l-5.384 3.18m0 0v12.34' },
  { id: 'dead-stock' as Tab, label: 'Dead Stock', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' },
  { id: 'reorder' as Tab, label: 'Reorder Interval', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
];

/* ─── Premium Chart Tooltip ─── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-glass backdrop-blur-xl border border-border-light rounded-xl px-4 py-3 shadow-xl">
      <p className="text-text-muted text-[10px] uppercase tracking-wider mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-semibold text-text">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Simple Tooltip for non-currency charts ─── */
function SimpleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-glass backdrop-blur-xl border border-border-light rounded-xl px-4 py-3 shadow-xl">
      <p className="text-text-muted text-[10px] uppercase tracking-wider mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-semibold text-text">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stock-value');

  return (
    <div className="space-y-6">
      {/* Tabs — Glass bar with animated indicator */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass rounded-2xl border border-border-light p-1.5"
      >
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-base'
                  : 'text-text-secondary hover:text-text hover:bg-hover/50'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="analyticsTab"
                  className="absolute inset-0 bg-gradient-to-r from-accent/15 to-accent/5 border border-accent/20 rounded-xl"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <svg className={`w-4 h-4 relative z-10 ${activeTab === tab.id ? 'text-accent' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'stock-value' && <StockValueSection />}
          {activeTab === 'trend' && <ConsumptionTrendSection />}
          {activeTab === 'machines' && <MachineConsumptionSection />}
          {activeTab === 'dead-stock' && <DeadStockSection />}
          {activeTab === 'reorder' && <ReorderIntervalSection />}
        </motion.div>
      </AnimatePresence>
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

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <Card title="Stock Value Trend (12 Months)">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8A035" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#E8A035" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2E323A" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Line type="monotone" dataKey="stockValue" name="Net Stock Value" stroke="#E8A035" strokeWidth={2.5} dot={{ r: 4, fill: '#E8A035', stroke: '#0B0D11', strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#E8A035', strokeWidth: 2, fill: '#0B0D11' }} />
            <Line type="monotone" dataKey="inValue" name="Total Inward" stroke="#4ADE80" strokeWidth={1.5} dot={{ r: 3, fill: '#4ADE80', stroke: '#0B0D11', strokeWidth: 2 }} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="outValue" name="Total Outward" stroke="#EF4444" strokeWidth={1.5} dot={{ r: 3, fill: '#EF4444', stroke: '#0B0D11', strokeWidth: 2 }} strokeDasharray="5 5" />
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
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an item..."
            className="w-full bg-base border border-border-light rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all"
          />
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-10 w-full mt-1 glass rounded-xl border border-border-light shadow-xl max-h-48 overflow-y-auto"
            >
              {searchResults.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full px-4 py-2.5 text-left hover:bg-hover/50 flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-mono text-xs text-accent mr-2">{item.item_code}</span>
                    <span className="text-sm text-text">{item.item_name}</span>
                  </div>
                  <span className="text-xs text-text-muted">Stock: {item.current_stock}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {selectedItem && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-accent/5 rounded-lg border border-accent/10">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span className="font-mono text-sm text-accent">{selectedItem.code}</span>
            <span className="text-text-secondary text-sm">—</span>
            <span className="text-text text-sm">{selectedItem.name}</span>
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {!loading && itemId && data.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <defs>
                <linearGradient id="gradConsumption" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8A035" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#E8A035" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E323A" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<SimpleTooltip />} />
              <Line type="monotone" dataKey="quantity" name="Quantity Consumed" stroke="#E8A035" strokeWidth={2.5} dot={{ r: 4, fill: '#E8A035', stroke: '#0B0D11', strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#E8A035', strokeWidth: 2, fill: '#0B0D11' }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {!loading && itemId && data.length === 0 && (
          <EmptyState message="No consumption data for this item" />
        )}

        {!itemId && !loading && (
          <EmptyState message="Select an item to view its consumption trend" icon="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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
            className="bg-base border border-border-light rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-base border border-border-light rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all"
          >
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {loading ? <LoadingSkeleton /> : (
          <>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <defs>
                    <linearGradient id="gradQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8A035" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#E8A035" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#4ADE80" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E323A" vertical={false} />
                  <XAxis dataKey="machineName" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="totalQty" name="Quantity" fill="url(#gradQty)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="totalValue" name="Value" fill="url(#gradValue)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No machine consumption data for this month" />
            )}
          </>
        )}
      </Card>

      {/* Unusual Consumption Flags */}
      <Card title="Unusual Consumption — Worth Checking" titleColor="text-danger">
        {unusual.length === 0 ? (
          <EmptyState message="No unusual consumption detected this month" icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        ) : (
          <div className="space-y-3">
            {unusual.map((flag, i) => (
              <motion.div
                key={flag.machineId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="p-4 glass rounded-xl border border-danger/15"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                    <div className="font-semibold text-text">{flag.machineName}</div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-danger/10 text-danger rounded-full border border-danger/20">
                    +{flag.percentAbove}% above average
                  </span>
                </div>
                <div className="text-sm text-text-secondary mb-2">
                  Current: <span className="font-mono font-medium text-text">{flag.currentMonthQty}</span> pcs
                  {' · '}6-month avg: <span className="font-mono text-text">{flag.sixMonthAvgQty}</span> pcs/month
                </div>
                <div className="text-xs text-text-muted">
                  Top items: {flag.topItems.map((ti) => ti.itemCode).join(', ')}
                </div>
              </motion.div>
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
    switch (cat) {
      case '90days': return <span className="px-2 py-0.5 text-[10px] font-semibold bg-low/10 text-low rounded-full border border-low/20">90+ days</span>;
      case '180days': return <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#F97316]/10 text-[#F97316] rounded-full border border-[#F97316]/20">180+ days</span>;
      case '365days': return <span className="px-2 py-0.5 text-[10px] font-semibold bg-danger/10 text-danger rounded-full border border-danger/20">365+ days</span>;
      default: return <span className="px-2 py-0.5 text-[10px] font-semibold bg-ok/10 text-ok rounded-full border border-ok/20">Active</span>;
    }
  };

  const filterStyles: Record<string, { active: string; count: string }> = {
    '90days': { active: 'border-low/40 bg-low/5', count: 'text-low' },
    '180days': { active: 'border-[#F97316]/40 bg-[#F97316]/5', count: 'text-[#F97316]' },
    '365days': { active: 'border-danger/40 bg-danger/5', count: 'text-danger' },
  };

  return (
    <div className="space-y-4">
      <Card title="Dead Stock Report">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { key: '90days', count: counts['90days'], label: '90+ days' },
            { key: '180days', count: counts['180days'], label: '180+ days' },
            { key: '365days', count: counts['365days'], label: '365+ days' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key as any)}
              className={`p-3 rounded-xl text-center border transition-all ${
                filter === item.key
                  ? filterStyles[item.key].active
                  : 'border-border-light bg-base/50 hover:bg-hover/50'
              }`}
            >
              <div className={`text-2xl font-bold ${filterStyles[item.key].count}`}>{item.count}</div>
              <div className="text-xs text-text-muted mt-0.5">{item.label}</div>
            </button>
          ))}
          <div className="p-3 rounded-xl text-center border border-border-light bg-base/50">
            <div className="text-2xl font-bold text-text">{filtered.length}</div>
            <div className="text-xs text-text-muted mt-0.5">Total shown</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-accent/5 rounded-lg border border-accent/10">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12h-3.75a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 018.25 4.5h9A2.25 2.25 0 0119.5 6.75v4.5a2.25 2.25 0 01-2.25 2.25H13.5" />
          </svg>
          <span className="text-sm text-text-secondary">Tied-up value:</span>
          <span className="font-semibold text-accent">{formatCurrency(totalValue)}</span>
        </div>

        {loading ? <LoadingSkeleton /> : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 pl-3 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em]">Item</th>
                  <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-right">Stock</th>
                  <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-right">Rate</th>
                  <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-right">Tied Value</th>
                  <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em]">Last Movement</th>
                  <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-center">Days</th>
                  <th className="pb-2 pr-3 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <motion.tr
                    key={item.itemId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="border-t border-border-light hover:bg-hover/50 transition-colors"
                  >
                    <td className="py-2.5 pl-3">
                      <div className="font-mono text-xs text-accent">{item.itemCode}</div>
                      <div className="text-text truncate max-w-[200px]">{item.itemName}</div>
                    </td>
                    <td className="py-2.5 text-right font-mono text-text-secondary">{item.currentStock} {item.unit}</td>
                    <td className="py-2.5 text-right font-mono text-text-secondary">{item.lastRate ? formatCurrency(item.lastRate) : '-'}</td>
                    <td className="py-2.5 text-right font-mono font-medium text-text">{formatCurrency(item.tiedUpValue)}</td>
                    <td className="py-2.5 text-text-secondary text-xs">{item.lastMovementDate || 'Never'}</td>
                    <td className="py-2.5 text-center font-mono text-text-secondary">{item.daysSinceMovement ?? '-'}</td>
                    <td className="py-2.5 pr-3 text-center">{badge(item.deadCategory)}</td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7}><EmptyState message="No dead stock items" /></td></tr>
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
        <p className="text-sm text-text-secondary mb-4">Items sorted by reorder frequency (shortest interval first)</p>

        {loading ? <LoadingSkeleton /> : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 pl-3 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em]">Item</th>
                  <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-right">Stock</th>
                  <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-right">Avg Days</th>
                  <th className="pb-2 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em] text-right">Reorders</th>
                  <th className="pb-2 pr-3 font-semibold text-[10px] text-text-muted uppercase tracking-[0.15em]">Last Received</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <motion.tr
                    key={item.itemId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="border-t border-border-light hover:bg-hover/50 transition-colors"
                  >
                    <td className="py-2.5 pl-3">
                      <div className="font-mono text-xs text-accent">{item.itemCode}</div>
                      <div className="text-text truncate max-w-[200px]">{item.itemName}</div>
                    </td>
                    <td className="py-2.5 text-right font-mono text-text-secondary">{item.currentStock} {item.unit}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-mono font-medium ${
                        item.avgDaysBetweenReorders && item.avgDaysBetweenReorders < 30 ? 'text-danger' :
                        item.avgDaysBetweenReorders && item.avgDaysBetweenReorders < 60 ? 'text-low' :
                        'text-text'
                      }`}>
                        {item.avgDaysBetweenReorders ?? '-'}
                      </span>
                      {item.avgDaysBetweenReorders && <span className="text-xs text-text-muted ml-1">days</span>}
                    </td>
                    <td className="py-2.5 text-right font-mono text-text-secondary">{item.totalReorders}</td>
                    <td className="py-2.5 pr-3 text-text-secondary text-xs">{item.lastReceivedDate || '-'}</td>
                  </motion.tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={5}><EmptyState message="Not enough reorder data" /></td></tr>
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
    <div className="glass rounded-2xl border border-border-light overflow-hidden">
      <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
        <h2 className={`text-sm font-semibold ${titleColor || 'text-text'}`}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-8 rounded-lg w-1/3" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: string }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon || 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z'} />
        </svg>
      </div>
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}
