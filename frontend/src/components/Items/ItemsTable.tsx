import { motion } from 'framer-motion';
import type { Item } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { staggerContainer, staggerItem } from '../../lib/motion';

interface ItemsTableProps {
  items: Item[];
  onEdit: (item: Item) => void;
  onDeactivate: (item: Item) => void;
  onViewItem?: (itemId: number) => void;
  loading: boolean;
}

function StockBadge({ stock, min }: { stock: number; min: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold badge-danger">
        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
        OUT
      </span>
    );
  }
  if (min > 0 && stock <= min) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold badge-low">
        <span className="w-1.5 h-1.5 rounded-full bg-low" />
        LOW
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold badge-ok">
      <span className="w-1.5 h-1.5 rounded-full bg-ok" />
      {stock}
    </span>
  );
}

export function ItemsTable({ items, onEdit, onDeactivate, onViewItem, loading }: ItemsTableProps) {
  const { canDoStockOps, canDeleteItem } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface">
        <div className="text-text-secondary text-sm">No items found</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 table-head">
          <tr>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-28">Code</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Name</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-24">Category</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-20">Brand</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-72">Value / Unit</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-14">Unit</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-24">Stock</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-16">Min</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-32">Rack</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold text-text-secondary uppercase tracking-[0.1em] w-24">Actions</th>
          </tr>
        </thead>
        <motion.tbody
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="divide-y divide-line-subtle"
        >
          {items.map((item, i) => {
            return (
              <motion.tr
                key={item.id}
                variants={staggerItem}
                className={`${i % 2 === 0 ? 'table-row-alt' : ''} hover:bg-hover transition-colors duration-150 group border-l-2 border-l-transparent hover:border-l-accent`}
              >
                <td className="px-4 py-2.5">
                  {onViewItem ? (
                    <button
                      onClick={() => onViewItem(item.id)}
                      className="font-mono text-xs text-accent hover:text-accent-text hover:underline font-medium"
                    >
                      {item.item_code}
                    </button>
                  ) : (
                    <span className="font-mono text-xs text-accent font-medium">{item.item_code}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="truncate max-w-xs text-text">{item.item_name}</div>
                  {item.item_aliases.length > 0 && (
                    <div className="text-[11px] text-text-muted truncate">
                      {item.item_aliases.map((a) => a.alias_name).join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-text-secondary text-xs">
                  {item.category?.name || '-'}
                </td>
                <td className="px-4 py-2.5 text-text-secondary text-xs">
                  {item.brand || '-'}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {item.spec ? (
                    <span className="text-text font-mono" title={item.spec}>
                      {item.spec}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center text-text-secondary text-xs">
                  {item.unit}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <StockBadge stock={item.current_stock} min={item.min_stock} />
                </td>
                <td className="px-4 py-2.5 text-right text-text-secondary font-mono text-xs">
                  {item.min_stock}
                </td>
                <td className="px-4 py-2.5 text-text-secondary text-xs">
                  {item.rack_location || '-'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canDoStockOps && (
                      <button
                        onClick={() => onEdit(item)}
                        className="px-2 py-0.5 text-xs text-accent hover:bg-accent-dim rounded-md transition-colors"
                        title="Edit item"
                      >
                        Edit
                      </button>
                    )}
                    {canDeleteItem && (
                      <button
                        onClick={() => onDeactivate(item)}
                        className="px-2 py-0.5 text-xs text-danger hover:bg-danger-dim rounded-md transition-colors"
                        title="Deactivate item"
                      >
                        Del
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </motion.tbody>
      </table>
    </div>
  );
}
