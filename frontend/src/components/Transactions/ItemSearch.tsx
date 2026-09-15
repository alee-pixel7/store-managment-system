// ItemSearch Component
// Smart search dropdown for finding items quickly

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import type { SearchItem } from '../../types';
import { searchItems } from '../../api/transactions';
import { useDebounce } from '../../hooks/useDebounce';

interface ItemSearchProps {
  onSelect: (item: SearchItem) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ItemSearch({ onSelect, placeholder = 'Search items...', disabled = false }: ItemSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);

  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    searchItems(debouncedQuery)
      .then((data) => {
        setResults(data);
        setIsOpen(data.length > 0);
        setSelectedIndex(-1);
      })
      .catch((error) => {
        console.error('Search failed:', error);
        setResults([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SearchItem) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2.5 sm:py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent disabled:bg-elevated min-h-[48px] sm:min-h-0"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((item, index) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-3 py-3 sm:py-2 cursor-pointer border-b border-gray-100 last:border-0 min-h-[52px] ${
                index === selectedIndex ? 'bg-accent-dim' : 'hover:bg-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent font-medium">
                    {item.item_code}
                  </span>
                  <span className="text-sm text-text truncate">
                    {item.item_name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-text-secondary">
                    Stock: <span className="font-mono text-text">{item.current_stock}</span> {item.unit}
                  </span>
                  {item.rack_location && (
                    <span className="text-gray-400 hidden lg:inline">
                      {item.rack_location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
