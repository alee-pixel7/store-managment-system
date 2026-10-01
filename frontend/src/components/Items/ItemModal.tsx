// ItemModal Component
// Modal form for creating and editing items

import { useState, useEffect } from 'react';
import type { Item, Category } from '../../types';
import { AliasInput } from './AliasInput';
import { Dropdown } from '../ui/Dropdown';

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
    current_stock: '',
    spec: '',
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
        current_stock: String(item.current_stock),
        spec: item.spec || '',
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
        current_stock: '',
        spec: '',
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
      const data: Record<string, unknown> = {
        item_code: formData.item_code,
        item_name: formData.item_name,
        category_id: formData.category_id ? Number(formData.category_id) : (isEditing ? null : undefined),
        brand: formData.brand || undefined,
        unit: formData.unit,
        min_stock: Number(formData.min_stock),
        rack_location: formData.rack_location || undefined,
        // Send raw: '' clears the spec on the server, text sets it
        spec: formData.spec,
        notes: formData.notes || undefined,
        aliases: formData.aliases,
      };

      // Manual stock edit — only when the field was actually touched.
      // Empty/non-numeric blocked here; negative allowed (signed ADJUST on server).
      if (isEditing && formData.current_stock !== String(item!.current_stock)) {
        const raw = formData.current_stock.trim();
        if (raw === '') {
          setError('Current Stock cannot be empty — enter a number (negative allowed)');
          setLoading(false);
          return;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          setError('Current Stock must be a valid number (negative allowed)');
          setLoading(false);
          return;
        }
        data.current_stock = parsed;
      }

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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="card-elevated rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-light bg-elevated">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">
              {isEditing ? 'Edit Item' : 'Add New Item'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 text-text-secondary hover:text-text text-xl font-bold leading-none rounded-lg hover:bg-hover transition-colors"
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
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Item Code *
              </label>
              <input
                type="text"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value.toUpperCase() })}
                required
                placeholder="e.g., BRG-6205"
                className="input w-full text-sm font-mono"
              />
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                required
                placeholder="e.g., Deep Groove Ball Bearing"
                className="input w-full text-sm"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Category
              </label>
              <Dropdown
                options={[
                  { value: '', label: 'No Category' },
                  ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                ]}
                value={formData.category_id}
                onChange={(v) => setFormData({ ...formData, category_id: String(v) })}
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., SKF"
                className="input w-full text-sm"
              />
            </div>

            {/* Spec / Value */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Spec / Value
              </label>
              <input
                type="text"
                value={formData.spec}
                onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                placeholder="e.g., 10A / 24V / 110MM / 6205ZZ"
                maxLength={200}
                className="input w-full text-sm"
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Shown in the Value / Unit column and exports
              </p>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Unit *
              </label>
              <Dropdown
                options={UNITS.map((u) => ({ value: u, label: u }))}
                value={formData.unit}
                onChange={(v) => setFormData({ ...formData, unit: String(v) })}
              />
            </div>

            {/* Min Stock */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Min Stock
              </label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                min="0"
                step="1"
                className="input w-full text-sm"
              />
            </div>

            {/* Current Stock — manual edit records a signed ADJUST transaction */}
            {isEditing && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Current Stock
                </label>
                <input
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                  step="1"
                  placeholder="e.g., 120"
                  className="input w-full text-sm font-mono"
                />
                <p className="mt-1 text-[11px] text-text-muted">
                  Saves as an ADJUST transaction · negative allowed
                </p>
              </div>
            )}

            {/* Rack Location */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Rack Location
              </label>
              <input
                type="text"
                value={formData.rack_location}
                onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                placeholder="e.g., Rack A-03 / Bin 7"
                className="input w-full text-sm"
              />
            </div>

            {/* Aliases */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
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
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="input w-full text-sm"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-light bg-elevated flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary btn-md"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
