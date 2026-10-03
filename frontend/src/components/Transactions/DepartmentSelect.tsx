// DepartmentSelect Component
// Dropdown for selecting departments with "add new" option

import { useState, useEffect } from 'react';
import type { Department } from '../../types';
import { listDepartments, createDepartment, deleteDepartment } from '../../api/transactions';
import { Dropdown } from '../ui/Dropdown';
import { ManageListModal } from './ManageListModal';

interface DepartmentSelectProps {
  value: number | null;
  onChange: (departmentId: number | null) => void;
  disabled?: boolean;
}

export function DepartmentSelect({ value, onChange, disabled = false }: DepartmentSelectProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const fetchDepartments = async () => {
    try {
      const data = await listDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = async () => {
    if (!newDepartment.trim()) return;

    setSaving(true);
    try {
      const created = await createDepartment({ name: newDepartment });
      setDepartments([...departments, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id);
      setShowAddModal(false);
      setNewDepartment('');
    } catch (error) {
      console.error('Failed to create department:', error);
      alert('Failed to create department');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    await deleteDepartment(id);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    if (value === id) onChange(null);
  };

  return (
    <>
      <div className="flex gap-2 items-stretch">
        <Dropdown
          options={[
            { value: '', label: 'Select Department' },
            ...departments.map((dept) => ({ value: dept.id, label: dept.name })),
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
          +
        </button>
        <button
          type="button"
          onClick={() => setShowManageModal(true)}
          disabled={disabled}
          title="Delete departments"
          className="btn btn-outline btn-sm"
        >
          🗑
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card-elevated rounded-2xl w-full max-w-sm">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Department</h3>
                <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text text-xl">×</button>
              </div>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Department name"
                className="input w-full text-sm"
                autoFocus
              />
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={handleAdd} disabled={!newDepartment.trim() || saving} className="btn btn-primary btn-sm">
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageModal && (
        <ManageListModal
          title="Manage Departments"
          items={departments.map((d) => ({ id: d.id, label: d.name }))}
          onDelete={(item) => handleDeleteEntry(item.id)}
          onClose={() => setShowManageModal(false)}
          emptyText="No departments yet"
        />
      )}
    </>
  );
}
