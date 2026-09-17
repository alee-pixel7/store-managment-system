// MachineSelect Component
// Dropdown for selecting machines with "add new" option

import { useState, useEffect } from 'react';
import type { Machine } from '../../types';
import { listMachines, createMachine } from '../../api/transactions';
import { Dropdown } from '../ui/Dropdown';

interface MachineSelectProps {
  departmentId: number | null;
  value: number | null;
  onChange: (machineId: number | null) => void;
  disabled?: boolean;
}

export function MachineSelect({ departmentId, value, onChange, disabled = false }: MachineSelectProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMachine, setNewMachine] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const data = await listMachines(departmentId || undefined);
      setMachines(data);
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [departmentId]);

  const handleAdd = async () => {
    if (!newMachine.name.trim()) return;

    setSaving(true);
    try {
      const created = await createMachine({
        name: newMachine.name,
        code: newMachine.code || undefined,
        department_id: departmentId || undefined,
      });
      setMachines([...machines, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id);
      setShowAddModal(false);
      setNewMachine({ name: '', code: '' });
    } catch (error) {
      console.error('Failed to create machine:', error);
      alert('Failed to create machine');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 items-stretch">
        <Dropdown
          options={[
            { value: '', label: 'Select Machine' },
            ...machines.map((machine) => ({
              value: machine.id,
              label: machine.code ? `${machine.code} - ${machine.name}` : machine.name,
            })),
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
          className="px-2 py-1 text-sm text-accent border border-accent rounded hover:bg-accent-dim disabled:opacity-50"
        >
          +
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-sm">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Machine</h3>
                <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text text-xl">×</button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name *</label>
                <input
                  type="text"
                  value={newMachine.name}
                  onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                  placeholder="Machine name"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Code</label>
                <input
                  type="text"
                  value={newMachine.code}
                  onChange={(e) => setNewMachine({ ...newMachine, code: e.target.value })}
                  placeholder="Optional code"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-sm text-text bg-surface border border-border rounded hover:bg-hover">Cancel</button>
              <button onClick={handleAdd} disabled={!newMachine.name.trim() || saving} className="px-3 py-1.5 text-sm text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50">
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
