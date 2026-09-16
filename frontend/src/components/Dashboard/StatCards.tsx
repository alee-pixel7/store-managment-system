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
  const cards = [
    {
      label: 'Total Items',
      value: totalActiveItems,
      numericValue: totalActiveItems,
      sub: null,
      action: () => onNavigate('items'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      numericValue: lowStockCount,
      sub: lowStockCount > 0 ? 'needs attention' : 'all good',
      action: () => onNavigate('items?filter=low_stock'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      accent: 'text-low',
      bg: 'bg-low-dim',
      border: 'gradient-border-left-low',
      glow: 'shadow-low/5',
    },
    {
      label: 'Out of Stock',
      value: outOfStockCount,
      numericValue: outOfStockCount,
      sub: outOfStockCount > 0 ? 'needs restocking' : null,
      action: () => onNavigate('items?filter=out_of_stock'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      accent: 'text-danger',
      bg: 'bg-danger-dim',
      border: 'gradient-border-left-danger',
      glow: 'shadow-danger/5',
    },
    {
      label: 'Stock Value',
      value: totalStockValue,
      numericValue: totalStockValue,
      isCurrency: true,
      sub: null,
      action: () => onNavigate('items'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      accent: 'text-ok',
      bg: 'bg-ok-dim',
      border: 'gradient-border-left-ok',
      glow: 'shadow-ok/5',
    },
    {
      label: 'Stock In',
      value: todayInTotalQty,
      numericValue: todayInTotalQty,
      sub: `${todayInCount} txn${todayInCount !== 1 ? 's' : ''} today`,
      action: () => onNavigate('stock-in'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-6-6h12" />
        </svg>
      ),
      accent: 'text-ok',
      bg: 'bg-ok-dim',
      border: 'gradient-border-left-ok',
      glow: 'shadow-ok/5',
    },
    {
      label: 'Issued Out',
      value: todayOutTotalQty,
      numericValue: todayOutTotalQty,
      sub: `${todayOutCount} txn${todayOutCount !== 1 ? 's' : ''} today`,
      action: () => onNavigate('stock-out'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
        </svg>
      ),
      accent: 'text-danger',
      bg: 'bg-danger-dim',
      border: 'gradient-border-left-danger',
      glow: 'shadow-danger/5',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <motion.button
          key={card.label}
          onClick={card.action}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          variants={cardHover}
          whileHover="hover"
          whileTap="tap"
          className={`relative glass rounded-xl ${card.border} overflow-hidden text-left shadow-md ${card.glow} hover:shadow-lg transition-shadow duration-200`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em]">
                {card.label}
              </span>
              <div className={`${card.bg} ${card.accent} p-1.5 rounded-lg`}>
                {card.icon}
              </div>
            </div>
            <div className={`text-2xl font-bold ${card.accent} tracking-tight`}>
              {card.isCurrency ? (
                <AnimatedNumber value={card.numericValue} prefix="₹" />
              ) : (
                <AnimatedNumber value={card.numericValue} />
              )}
            </div>
            {card.sub && (
              <div className="text-[11px] text-text-muted mt-1.5">{card.sub}</div>
            )}
          </div>
          <div className={`h-0.5 ${card.bg}`} />
        </motion.button>
      ))}
    </div>
  );
}
