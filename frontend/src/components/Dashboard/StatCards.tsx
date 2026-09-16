interface StatCardsProps {
  totalActiveItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  todayInCount: number;
  todayInTotalQty: number;
  todayOutCount: number;
  todayOutTotalQty: number;
  onNavigate: (page: string) => void;
}

export function StatCards({
  totalActiveItems,
  lowStockCount,
  outOfStockCount,
  totalStockValue,
  todayInCount,
  todayInTotalQty,
  todayOutCount,
  todayOutTotalQty,
  onNavigate,
}: StatCardsProps) {
  const cards = [
    {
      label: 'Total Items',
      value: totalActiveItems.toLocaleString(),
      sub: null,
      action: () => onNavigate('items'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      accent: 'text-accent',
      bg: 'bg-accent-dim',
      border: 'border-accent/15',
    },
    {
      label: 'Low Stock',
      value: lowStockCount.toLocaleString(),
      sub: lowStockCount > 0 ? 'needs attention' : 'all good',
      action: () => onNavigate('items?filter=low_stock'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      accent: 'text-low',
      bg: 'bg-low-dim',
      border: 'border-low/15',
    },
    {
      label: 'Out of Stock',
      value: outOfStockCount.toLocaleString(),
      sub: outOfStockCount > 0 ? 'needs restocking' : null,
      action: () => onNavigate('items?filter=out_of_stock'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      accent: 'text-danger',
      bg: 'bg-danger-dim',
      border: 'border-danger/15',
    },
    {
      label: 'Stock Value',
      value: `₹${totalStockValue.toLocaleString('en-IN')}`,
      sub: null,
      action: () => onNavigate('items'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      accent: 'text-ok',
      bg: 'bg-ok-dim',
      border: 'border-ok/15',
    },
    {
      label: 'Stock In',
      value: todayInTotalQty.toLocaleString(),
      sub: `${todayInCount} txn${todayInCount !== 1 ? 's' : ''} today`,
      action: () => onNavigate('stock-in'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-6-6h12" />
        </svg>
      ),
      accent: 'text-ok',
      bg: 'bg-ok-dim',
      border: 'border-ok/15',
    },
    {
      label: 'Issued Out',
      value: todayOutTotalQty.toLocaleString(),
      sub: `${todayOutCount} txn${todayOutCount !== 1 ? 's' : ''} today`,
      action: () => onNavigate('stock-out'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
        </svg>
      ),
      accent: 'text-danger',
      bg: 'bg-danger-dim',
      border: 'border-danger/15',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={card.action}
          className={`relative bg-surface rounded-xl border ${card.border} overflow-hidden group cursor-pointer hover:brightness-110 transition-all text-left`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`${card.bg} ${card.accent} p-1.5 rounded-lg`}>
                {card.icon}
              </div>
            </div>
            <div className={`text-2xl font-bold ${card.accent} tracking-tight`}>
              {card.value}
            </div>
            {card.sub && (
              <div className="text-xs text-text-muted mt-1">{card.sub}</div>
            )}
          </div>
          <div className={`h-0.5 ${card.bg}`} />
        </button>
      ))}
    </div>
  );
}
