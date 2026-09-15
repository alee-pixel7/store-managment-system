// DepartmentSelect Component
// Dropdown for selecting departments with "add new" option

import { useState, useEffect } from 'react';
import type { Department } from '../../types';
import { listDepartments, createDepartment } from '../../api/transactions';

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

  return (
    <>
      <div className="flex gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled || loading}
          className="flex-1 px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent disabled:bg-elevated"
        >
          <option value="">Select Department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={disabled}
          className="px-2 py-1 text-sm text-accent border border-accent rounded hover:bg-accent-dim disabled:opacity-50"
        >
          +
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-sm">
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
                className="w-full px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                autoFocus
              />
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-sm text-text bg-surface border border-border rounded hover:bg-hover">Cancel</button>
              <button onClick={handleAdd} disabled={!newDepartment.trim() || saving} className="px-3 py-1.5 text-sm text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50">
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
