// CategoryManager Component
// Modal for managing categories: list, create, rename, delete

import { useState } from 'react';
import type { Category } from '../../types';
import { createCategory, updateCategory, deleteCategory } from '../../api/items';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onUpdate: () => void;
}

export function CategoryManager({ isOpen, onClose, categories, onUpdate }: CategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createCategory({ name: newName.trim() });
      setNewName('');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (id: number) => {
    if (!editName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await updateCategory(id, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string, count: number) => {
    const msg = count > 0
      ? `Delete "${name}"? ${count} item(s) will have their category cleared.`
      : `Delete "${name}"?`;
    if (!confirm(msg)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCategory(id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border bg-elevated flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Manage Categories</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text text-xl font-bold">×</button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {error && (
            <div className="mb-3 p-2 bg-danger-dim text-danger text-sm rounded border border-danger/20">{error}</div>
          )}

          {/* Create new */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="New category name..."
              className="flex-1 px-3 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-accent focus:border-accent"
            />
            <button
              onClick={handleCreate}
              disabled={loading || !newName.trim()}
              className="px-3 py-1.5 text-sm font-medium text-base bg-accent rounded hover:bg-accent-hover disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {/* Category list */}
          <div className="space-y-1">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-elevated group">
                {editingId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(cat.id)}
                      className="flex-1 px-2 py-1 border border-accent rounded text-sm focus:ring-1 focus:ring-accent"
                      autoFocus
                    />
                    <button onClick={() => handleRename(cat.id)} disabled={loading} className="text-ok text-sm font-medium px-2">Save</button>
                    <button onClick={() => { setEditingId(null); setEditName(''); }} className="text-text-secondary text-sm px-2">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-text">{cat.name}</span>
                    {cat._count && cat._count.items > 0 && (
                      <span className="text-xs text-text-secondary bg-elevated px-1.5 py-0.5 rounded">{cat._count.items}</span>
                    )}
                    <button
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                      className="text-text-secondary hover:text-accent text-sm opacity-0 group-hover:opacity-100 px-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name, cat._count?.items || 0)}
                      className="text-text-secondary hover:text-danger text-sm opacity-0 group-hover:opacity-100 px-1"
                    >
                      Del
                    </button>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-sm text-text-secondary text-center py-4">No categories yet</div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border bg-elevated flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-text bg-surface border border-border rounded hover:bg-hover">Close</button>
        </div>
      </div>
    </div>
  );
}
