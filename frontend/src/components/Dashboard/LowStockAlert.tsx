import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../lib/motion';

interface LowStockItem {
  id: number;
  item_code: string;
  item_name: string;
  brand: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  rack_location: string | null;
  category: string | null;
}

interface LowStockAlertProps {
  items: LowStockItem[];
  onViewItem: (itemId: number) => void;
}

export function LowStockAlert({ items, onViewItem }: LowStockAlertProps) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-xl border border-border-light overflow-hidden h-full">
        <div className="px-5 py-4 border-b border-border-light flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ok-dim flex items-center justify-center">
            <svg className="w-4 h-4 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">Low Stock Alert</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-ok/10 flex items-center justify-center mb-5 shadow-lg shadow-ok/10"
          >
            <svg className="w-10 h-10 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </motion.div>
          <p className="text-lg font-semibold text-text">All stocked up!</p>
          <p className="text-sm text-text-muted mt-1">No items need attention right now</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl border border-low/20 overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-low/10 bg-low-dim/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-low/15 flex items-center justify-center relative">
            <svg className="w-4 h-4 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-low rounded-full animate-pulse" />
          </div>
          <h2 className="text-xs font-semibold text-low uppercase tracking-[0.12em]">Low Stock Alert</h2>
        </div>
        <span className="text-xs font-bold text-low bg-low/15 px-3 py-1 rounded-full border border-low/15">
          {items.length}
        </span>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="divide-y divide-line-subtle max-h-[420px] overflow-y-auto"
      >
        {items.map((item) => {
          const stockPercent = item.min_stock > 0
            ? Math.min((item.current_stock / item.min_stock) * 100, 100)
            : 100;
          const barColor = stockPercent <= 30 ? 'bg-danger' : stockPercent <= 70 ? 'bg-low' : 'bg-ok';

          return (
            <motion.button
              key={item.id}
              variants={staggerItem}
              onClick={() => onViewItem(item.id)}
              className="w-full px-5 py-3.5 text-left hover:bg-hover transition-colors group"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-accent font-medium">{item.item_code}</span>
                    {item.brand && (
                      <span className="text-[10px] text-text-muted bg-elevated px-1.5 py-0.5 rounded">{item.brand}</span>
                    )}
                  </div>
                  <div className="text-sm text-text truncate mt-0.5 group-hover:text-accent transition-colors">{item.item_name}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {item.category || 'Uncategorized'}
                    {item.rack_location && ` · ${item.rack_location}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-low">{item.current_stock}</div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">min {item.min_stock}</div>
                </div>
              </div>
              {/* Stock level bar */}
              <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${stockPercent}%` }} />
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
