// PersonSelect Component
// Dropdown for selecting persons (issued to) with "add new" option

import { useState, useEffect } from 'react';
import type { Person } from '../../types';
import { listPersons, createPerson } from '../../api/transactions';
import { Dropdown } from '../ui/Dropdown';

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
        <Dropdown
          options={[
            { value: '', label: 'Select Person' },
            ...persons.map((person) => ({
              value: person.id,
              label: person.department ? `${person.name} (${person.department.name})` : person.name,
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
          className="btn btn-outline btn-sm"
        >
          +
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card-elevated rounded-2xl w-full max-w-sm">
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
                  className="input w-full text-sm"
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
                  className="input w-full text-sm"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={handleAdd} disabled={!newPerson.name.trim() || saving} className="btn btn-primary btn-sm">
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
