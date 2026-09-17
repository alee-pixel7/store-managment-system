// ItemsPage Component
// Main page for managing items - list, search, filter, CRUD

import { useState, useEffect, useCallback } from 'react';
import type { Item, Category } from '../../types';
import { listItems, searchItems, createItem, updateItem, softDeleteItem, listCategories } from '../../api/items';
import { downloadExport } from '../../api/export';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../contexts/AuthContext';
import { ItemsTable } from './ItemsTable';
import { ItemModal } from './ItemModal';
import { CategoryManager } from './CategoryManager';
import { Dropdown } from '../ui/Dropdown';
import { Pagination } from './Pagination';

interface ItemsPageProps {
  onViewItem?: (itemId: number) => void;
  initialFilter?: string | null;
}

export function ItemsPage({ onViewItem, initialFilter }: ItemsPageProps) {
  const { canDoStockOps } = useAuth();
  // State
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [lowStockOnly, setLowStockOnly] = useState(initialFilter === 'low_stock');
  const [outOfStockOnly, setOutOfStockOnly] = useState(initialFilter === 'out_of_stock');

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Load categories
  useEffect(() => {
    listCategories().then(setCategories).catch(console.error);
  }, []);

  // React to initialFilter changes (from dashboard navigation)
  useEffect(() => {
    if (initialFilter === 'low_stock') {
      setLowStockOnly(true);
      setOutOfStockOnly(false);
    } else if (initialFilter === 'out_of_stock') {
      setOutOfStockOnly(true);
      setLowStockOnly(false);
    }
  }, [initialFilter]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // If search term exists, use search API
      if (debouncedSearch.trim()) {
        const searchResults = await searchItems(debouncedSearch);
        // Convert search results to items format
        const items: Item[] = searchResults.map((r) => ({
          ...r,
          last_rate: null,
          barcode: null,
          image_path: null,
          is_active: true,
          notes: null,
          created_at: '',
          updated_at: '',
          item_aliases: [],
        }));
        setItems(items);
        setPagination({ page: 1, limit: 20, total: searchResults.length, totalPages: 1 });
      } else {
        // Use list API with filters
        const result = await listItems({
          page: pagination.page,
          limit: 50,
          category_id: categoryId,
          low_stock: lowStockOnly,
          out_of_stock: outOfStockOnly,
        });
        setItems(result.items);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pagination.page, categoryId, lowStockOnly, outOfStockOnly]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, categoryId, lowStockOnly, outOfStockOnly]);

  // Handlers
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    if (editingItem) {
      await updateItem(editingItem.id, data);
    } else {
      await createItem(data);
    }
    fetchItems();
  };

  const handleDeactivate = async (item: Item) => {
    if (window.confirm(`Deactivate "${item.item_code} - ${item.item_name}"?`)) {
      await softDeleteItem(item.id);
      fetchItems();
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      await downloadExport('items', {}, format);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-surface/80 border-b border-border-light px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">Items</h1>
            <p className="text-xs text-text-secondary mt-0.5">Manage inventory items and categories</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting === 'excel'}
              className="px-3 py-1.5 text-sm font-medium text-ok bg-ok-dim border border-ok/20 rounded-lg hover:bg-ok/20 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">{exporting === 'excel' ? 'Exporting...' : 'Excel'}</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting === 'pdf'}
              className="px-3 py-1.5 text-sm font-medium text-danger bg-danger-dim border border-danger/20 rounded-lg hover:bg-danger/20 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{exporting === 'pdf' ? 'Exporting...' : 'PDF'}</span>
            </button>
            {canDoStockOps && (
              <>
                <button
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="px-3 py-1.5 text-sm font-medium text-accent bg-accent-dim border border-accent/20 rounded-lg hover:bg-accent/20 flex items-center gap-2 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="hidden sm:inline">Categories</span>
                </button>
                <button
                  onClick={handleAdd}
                  className="px-4 py-1.5 text-sm font-semibold text-base bg-gradient-to-r from-accent to-accent-press rounded-lg hover:shadow-lg hover:shadow-accent/20 min-h-[44px] transition-all"
                >
                  + Add
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-3">
          {/* Search */}
          <div className="flex-1 sm:max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className="w-full px-3 py-2.5 sm:py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Category filter */}
            <Dropdown
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                  suffix: cat._count ? `(${cat._count.items})` : undefined,
                })),
              ]}
              value={categoryId || ''}
              onChange={(v) => setCategoryId(v ? Number(v) : undefined)}
              className="flex-1 sm:flex-initial sm:w-48"
            />

            {/* Low stock toggle */}
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => { setLowStockOnly(e.target.checked); setOutOfStockOnly(false); }}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="hidden sm:inline">Low Stock</span>
              <span className="sm:hidden">Low</span>
            </label>

            {/* Out of stock toggle */}
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={outOfStockOnly}
                onChange={(e) => { setOutOfStockOnly(e.target.checked); setLowStockOnly(false); }}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="hidden sm:inline">Out of Stock</span>
              <span className="sm:hidden">Out</span>
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mx-2 sm:mx-4 my-4 bg-surface rounded-lg shadow">
        <ItemsTable
          items={items}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
          onViewItem={onViewItem}
          loading={loading}
        />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        item={editingItem}
        categories={categories}
      />

      {/* Category Manager */}
      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onUpdate={() => listCategories().then(setCategories).catch(console.error)}
      />
    </div>
  );
}
