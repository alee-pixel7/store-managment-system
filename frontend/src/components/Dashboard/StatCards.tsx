import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { cardHover } from '../../lib/motion';

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

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const motionVal = useMotionValue(0);
  const displayed = useTransform(motionVal, (v) => {
    if (prefix === '₹') return `₹${Math.round(v).toLocaleString('en-IN')}`;
    return `${prefix}${Math.round(v).toLocaleString()}`;
  });
  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.8, ease: 'easeOut' });
    return controls.stop;
  }, [value, motionVal]);
  return <motion.span>{displayed}</motion.span>;
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
  const mainCards = [
    {
      label: 'Total Items',
      value: totalActiveItems,
      sub: null,
      action: () => onNavigate('items'),
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      accent: 'text-accent',
      bg: 'bg-accent-dim',
      border: 'gradient-border-left-accent',
      glow: 'shadow-accent/5',
    },
    {
      label: 'Low Stock',
      value: lowStockCount,
      sub: lowStockCount > 0 ? 'needs attention' : 'all clear',
      action: () => onNavigate('items?filter=low_stock'),
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      accent: 'text-low',
      bg: 'bg-low-dim',
      border: 'gradient-border-left-low',
      glow: 'shadow-low/5',
      pulse: lowStockCount > 0,
    },
    {
      label: 'Out of Stock',
      value: outOfStockCount,
      sub: outOfStockCount > 0 ? 'needs restocking' : null,
      action: () => onNavigate('items?filter=out_of_stock'),
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      accent: 'text-danger',
      bg: 'bg-danger-dim',
      border: 'gradient-border-left-danger',
      glow: 'shadow-danger/5',
      pulse: outOfStockCount > 0,
    },
    {
      label: 'Stock Value',
      value: totalStockValue,
      isCurrency: true,
      sub: null,
      action: () => onNavigate('items'),
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      accent: 'text-ok',
      bg: 'bg-ok-dim',
      border: 'gradient-border-left-ok',
      glow: 'shadow-ok/5',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Main Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mainCards.map((card, i) => (
          <motion.button
            key={card.label}
            onClick={card.action}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
            variants={cardHover}
            whileHover="hover"
            whileTap="tap"
            className={`relative card ${card.border} overflow-hidden text-left transition-all duration-200 group`}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-[0.1em]">
                  {card.label}
                </span>
                <div className={`${card.bg} ${card.accent} p-2 rounded-xl relative`}>
                  {card.icon}
                  {(card as any).pulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-danger rounded-full animate-ping" />
                  )}
                  {(card as any).pulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-danger rounded-full" />
                  )}
                </div>
              </div>
              <div className={`text-3xl font-bold ${card.accent} tracking-tight num`}>
                {card.isCurrency ? (
                  <AnimatedNumber value={card.value} prefix="₹" />
                ) : (
                  <AnimatedNumber value={card.value} />
                )}
              </div>
              {card.sub && (
                <div className="text-xs text-text-muted mt-2">{card.sub}</div>
              )}
            </div>
            <div className={`h-1 ${card.bg} opacity-60`} />
          </motion.button>
        ))}
      </div>

      {/* 2 Wide Activity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stock In Today */}
        <motion.button
          onClick={() => onNavigate('stock-in')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="card border-ok/15 overflow-hidden text-left hover:shadow-lg hover:shadow-ok/5 transition-all duration-200 group"
        >
          <div className="p-5 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-ok/10 flex items-center justify-center flex-shrink-0 group-hover:bg-ok/15 transition-colors">
              <svg className="w-7 h-7 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-[0.1em]">Stock In Today</div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-bold text-ok tracking-tight">
                  <AnimatedNumber value={todayInTotalQty} />
                </span>
                <span className="text-sm text-text-muted">
                  {todayInCount} txn{todayInCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <svg className="w-5 h-5 text-ok/40 group-hover:text-ok group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-ok/30 to-transparent" />
        </motion.button>

        {/* Issued Out Today */}
        <motion.button
          onClick={() => onNavigate('stock-out')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.37, duration: 0.35 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="card border-danger/15 overflow-hidden text-left hover:shadow-lg hover:shadow-danger/5 transition-all duration-200 group"
        >
          <div className="p-5 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center flex-shrink-0 group-hover:bg-danger/15 transition-colors">
              <svg className="w-7 h-7 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-[0.1em]">Issued Out Today</div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-bold text-danger tracking-tight">
                  <AnimatedNumber value={todayOutTotalQty} />
                </span>
                <span className="text-sm text-text-muted">
                  {todayOutCount} txn{todayOutCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <svg className="w-5 h-5 text-danger/40 group-hover:text-danger group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-danger/30 to-transparent" />
        </motion.button>
      </div>
    </div>
  );
}
