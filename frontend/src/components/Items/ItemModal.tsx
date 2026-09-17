// ItemModal Component
// Modal form for creating and editing items

import { useState, useEffect } from 'react';
import type { Item, Category } from '../../types';
import { AliasInput } from './AliasInput';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  item?: Item | null;
  categories: Category[];
}

const UNITS = ['PCS', 'KG', 'MTR', 'LTR', 'SET'];

export function ItemModal({ isOpen, onClose, onSave, item, categories }: ItemModalProps) {
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    category_id: '',
    brand: '',
    unit: 'PCS',
    min_stock: '0',
    rack_location: '',
    notes: '',
    aliases: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!item;

  // Populate form when editing
  useEffect(() => {
    if (item) {
      setFormData({
        item_code: item.item_code,
        item_name: item.item_name,
        category_id: item.category_id ? String(item.category_id) : '',
        brand: item.brand || '',
        unit: item.unit,
        min_stock: String(item.min_stock),
        rack_location: item.rack_location || '',
        notes: item.notes || '',
        aliases: item.item_aliases.map((a) => a.alias_name),
      });
    } else {
      setFormData({
        item_code: '',
        item_name: '',
        category_id: '',
        brand: '',
        unit: 'PCS',
        min_stock: '0',
        rack_location: '',
        notes: '',
        aliases: [],
      });
    }
    setError(null);
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        item_code: formData.item_code,
        item_name: formData.item_name,
        category_id: formData.category_id ? Number(formData.category_id) : (isEditing ? null : undefined),
        brand: formData.brand || undefined,
        unit: formData.unit,
        min_stock: Number(formData.min_stock),
        rack_location: formData.rack_location || undefined,
        notes: formData.notes || undefined,
        aliases: formData.aliases,
      };

      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-elevated">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">
              {isEditing ? 'Edit Item' : 'Add New Item'}
            </h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Item Code */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Item Code *
              </label>
              <input
                type="text"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value.toUpperCase() })}
                required
                placeholder="e.g., BRG-6205"
                className="w-full px-3 py-1.5 border border-border rounded text-sm font-mono focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                required
                placeholder="e.g., Deep Groove Ball Bearing"
                className="w-full px-3 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-accent focus:border-accent"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., SKF"
                className="w-full px-3 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
                className="w-full px-3 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-accent focus:border-accent"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Stock */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Min Stock
              </label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                min="0"
                step="1"
                className="w-full px-3 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>

            {/* Rack Location */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">
                Rack Location
              </label>
              <input
                type="text"
                value={formData.rack_location}
                onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                placeholder="e.g., Rack A-03 / Bin 7"
                className="w-full px-3 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>

            {/* Aliases */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">
                Aliases (press Enter to add)
              </label>
              <AliasInput
                aliases={formData.aliases}
                onChange={(aliases) => setFormData({ ...formData, aliases })}
                placeholder="Type alias and press Enter"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-elevated flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-text bg-surface border border-border rounded hover:bg-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 text-sm text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
