// SupplierSelect Component
// Dropdown for selecting suppliers with "add new" option

import { useState, useEffect } from 'react';
import type { Supplier } from '../../types';
import { listSuppliers, createSupplier, deleteSupplier } from '../../api/transactions';
import { Dropdown } from '../ui/Dropdown';
import { ManageListModal } from './ManageListModal';

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
  const [showManageModal, setShowManageModal] = useState(false);

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

  const handleDeleteEntry = async (id: number) => {
    await deleteSupplier(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    if (value === id) onChange(null);
  };

  return (
    <>
      <div className="flex gap-2 items-stretch">
        <Dropdown
          options={[
            { value: '', label: 'Select Supplier' },
            ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
          ]}
          value={value || ''}
          onChange={(v) => onChange(v ? Number(v) : null)}
          disabled={disabled || loading}
          className="flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={disabled}
          className="btn btn-outline btn-sm"
        >
          + New
        </button>
        <button
          type="button"
          onClick={() => setShowManageModal(true)}
          disabled={disabled}
          title="Delete suppliers"
          className="btn btn-outline btn-sm"
        >
          🗑
        </button>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card-elevated rounded-2xl w-full max-w-md">
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
                  className="input w-full text-sm"
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Phone</label>
                <input
                  type="text"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  className="input w-full text-sm"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Address</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="input w-full text-sm"
                  placeholder="Address"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-ghost btn-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSupplier}
                disabled={!newSupplier.name.trim() || saving}
                className="btn btn-primary btn-md"
              >
                {saving ? 'Adding...' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageModal && (
        <ManageListModal
          title="Manage Suppliers"
          items={suppliers.map((s) => ({ id: s.id, label: s.name }))}
          onDelete={(item) => handleDeleteEntry(item.id)}
          onClose={() => setShowManageModal(false)}
          emptyText="No suppliers yet"
        />
      )}
    </>
  );
}
