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
        <div className="px-5 py-4 border-b border-border-light">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">Low Stock Alert</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-14 h-14 rounded-full bg-ok-dim flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm font-medium">All stocked up</p>
          <p className="text-text-muted text-xs mt-1">No items below minimum level</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl border border-low/20 overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-low/10 bg-low-dim/50">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-low uppercase tracking-[0.12em]">Low Stock Alert</h2>
          <span className="text-[10px] font-bold text-low bg-low/15 px-2.5 py-1 rounded-full">
            {items.length}
          </span>
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="divide-y divide-line-subtle max-h-[420px] overflow-y-auto"
      >
        {items.map((item) => (
          <motion.button
            key={item.id}
            variants={staggerItem}
            onClick={() => onViewItem(item.id)}
            className="w-full px-5 py-3 text-left hover:bg-hover transition-colors group"
          >
            <div className="flex items-center justify-between gap-3">
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
                <div className="text-lg font-bold text-low">{item.current_stock}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">min {item.min_stock}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
