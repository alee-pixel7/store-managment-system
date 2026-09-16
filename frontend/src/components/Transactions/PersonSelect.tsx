// PersonSelect Component
// Dropdown for selecting persons (issued to) with "add new" option

import { useState, useEffect } from 'react';
import type { Person } from '../../types';
import { listPersons, createPerson } from '../../api/transactions';

interface PersonSelectProps {
  value: number | null;
  onChange: (personId: number | null) => void;
  disabled?: boolean;
}

export function PersonSelect({ value, onChange, disabled = false }: PersonSelectProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const fetchPersons = async () => {
    try {
      const data = await listPersons();
      setPersons(data);
    } catch (error) {
      console.error('Failed to fetch persons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  const handleAdd = async () => {
    if (!newPerson.name.trim()) return;

    setSaving(true);
    try {
      const created = await createPerson({
        name: newPerson.name,
        phone: newPerson.phone || undefined,
      });
      setPersons([...persons, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id);
      setShowAddModal(false);
      setNewPerson({ name: '', phone: '' });
    } catch (error) {
      console.error('Failed to create person:', error);
      alert('Failed to create person');
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
          <option value="">Select Person</option>
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} {person.department ? `(${person.department.name})` : ''}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-sm">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Person</h3>
                <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text text-xl">×</button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name *</label>
                <input
                  type="text"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                  placeholder="Person name"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Phone</label>
                <input
                  type="text"
                  value={newPerson.phone}
                  onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                  placeholder="Phone number"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-sm text-text bg-surface border border-border rounded hover:bg-hover">Cancel</button>
              <button onClick={handleAdd} disabled={!newPerson.name.trim() || saving} className="px-3 py-1.5 text-sm text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50">
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
