// ItemsTable Component
// Displays items in a dense, desktop-first table

import type { Item } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface ItemsTableProps {
  items: Item[];
  onEdit: (item: Item) => void;
  onDeactivate: (item: Item) => void;
  onViewItem?: (itemId: number) => void;
  loading: boolean;
}

export function ItemsTable({ items, onEdit, onDeactivate, onViewItem, loading }: ItemsTableProps) {
  const { canDoStockOps, canDeleteItem } = useAuth();
  const getRowClass = (item: Item): string => {
    if (item.current_stock <= 0) {
      return 'bg-red-50 hover:bg-red-100';
    }
    if (item.min_stock > 0 && item.current_stock <= item.min_stock) {
      return 'bg-amber-50 hover:bg-amber-100';
    }
    return 'hover:bg-hover';
  };

  const getStockClass = (item: Item): string => {
    if (item.current_stock <= 0) return 'text-red-600 font-semibold';
    if (item.min_stock > 0 && item.current_stock <= item.min_stock) return 'text-amber-600 font-semibold';
    return 'text-text';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface">
        <div className="text-text-secondary">Loading items...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface">
        <div className="text-text-secondary">No items found</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-elevated border-b border-border">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-text w-28">Code</th>
            <th className="px-3 py-2 text-left font-medium text-text">Name</th>
            <th className="px-3 py-2 text-left font-medium text-text w-24">Category</th>
            <th className="px-3 py-2 text-left font-medium text-text w-20">Brand</th>
            <th className="px-3 py-2 text-center font-medium text-text w-14">Unit</th>
            <th className="px-3 py-2 text-right font-medium text-text w-20">Stock</th>
            <th className="px-3 py-2 text-right font-medium text-text w-16">Min</th>
            <th className="px-3 py-2 text-left font-medium text-text w-32">Rack</th>
            <th className="px-3 py-2 text-center font-medium text-text w-24">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className={getRowClass(item)}>
              <td className="px-3 py-1.5">
                {onViewItem ? (
                  <button
                    onClick={() => onViewItem(item.id)}
                    className="font-mono text-xs text-accent hover:text-accent-text hover:underline font-medium"
                  >
                    {item.item_code}
                  </button>
                ) : (
                  <span className="font-mono text-xs text-accent font-medium">
                    {item.item_code}
                  </span>
                )}
              </td>
              <td className="px-3 py-1.5 text-text">
                <div className="truncate max-w-xs">{item.item_name}</div>
                {item.item_aliases.length > 0 && (
                  <div className="text-xs text-text-secondary truncate">
                    {item.item_aliases.map((a) => a.alias_name).join(', ')}
                  </div>
                )}
              </td>
              <td className="px-3 py-1.5 text-text-secondary text-xs">
                {item.category?.name || '-'}
              </td>
              <td className="px-3 py-1.5 text-text-secondary text-xs">
                {item.brand || '-'}
              </td>
              <td className="px-3 py-1.5 text-center text-text-secondary text-xs">
                {item.unit}
              </td>
              <td className={`px-3 py-1.5 text-right font-mono text-xs ${getStockClass(item)}`}>
                {item.current_stock}
              </td>
              <td className="px-3 py-1.5 text-right text-text-secondary font-mono text-xs">
                {item.min_stock}
              </td>
              <td className="px-3 py-1.5 text-text-secondary text-xs">
                {item.rack_location || '-'}
              </td>
              <td className="px-3 py-1.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  {canDoStockOps && (
                    <button
                      onClick={() => onEdit(item)}
                      className="px-2 py-0.5 text-xs text-accent hover:bg-accent-dim rounded"
                      title="Edit item"
                    >
                      Edit
                    </button>
                  )}
                  {canDeleteItem && (
                    <button
                      onClick={() => onDeactivate(item)}
                      className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 rounded"
                      title="Deactivate item"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
