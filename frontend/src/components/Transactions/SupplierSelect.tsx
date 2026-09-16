// SupplierSelect Component
// Dropdown for selecting suppliers with "add new" option

import { useState, useEffect } from 'react';
import type { Supplier } from '../../types';
import { listSuppliers, createSupplier } from '../../api/transactions';

interface SupplierSelectProps {
  value: number | null;
  onChange: (supplierId: number | null) => void;
  disabled?: boolean;
}

export function SupplierSelect({ value, onChange, disabled = false }: SupplierSelectProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const data = await listSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) return;

    setSaving(true);
    try {
      const created = await createSupplier(newSupplier);
      setSuppliers([...suppliers, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id);
      setShowAddModal(false);
      setNewSupplier({ name: '', phone: '', address: '' });
    } catch (error) {
      console.error('Failed to create supplier:', error);
      alert('Failed to create supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 items-stretch">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled || loading}
          className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent disabled:bg-elevated"
        >
          <option value="">Select Supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm text-accent border border-accent rounded hover:bg-accent-dim disabled:opacity-50"
        >
          + New
        </button>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add New Supplier</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-secondary hover:text-text text-xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name *</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Phone</label>
                <input
                  type="text"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Address</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                  placeholder="Address"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-1.5 text-sm text-text bg-surface border border-border rounded hover:bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSupplier}
                disabled={!newSupplier.name.trim() || saving}
                className="px-4 py-1.5 text-sm text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
