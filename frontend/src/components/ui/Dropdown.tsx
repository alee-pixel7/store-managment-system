// Dropdown Component
// Custom dropdown to replace native <select> — portal-rendered list escapes overflow-hidden parents

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownOption {
  value: string | number;
  label: string;
  suffix?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Dropdown({ options, value, onChange, placeholder = 'Select...', className = '', disabled = false }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [listPos, setListPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));

  // Compute list position from button rect
  const updateListPos = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setListPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  // Toggle open/close
  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen(prev => {
      if (!prev) {
        requestAnimationFrame(() => updateListPos());
      }
      return !prev;
    });
  }, [disabled, updateListPos]);

  // Recalc position on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    const recalc = () => updateListPos();
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [isOpen, updateListPos]);

  // Close on outside click (check both ref and list ref)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && ref.current.contains(target)) return;
      if (listRef.current && listRef.current.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="input w-full flex items-center justify-between gap-2 min-h-[44px] sm:min-h-0 text-left hover:border-accent/50 disabled:bg-elevated disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`truncate ${selected ? 'text-text' : 'text-text-secondary'}`}>
          {selected ? selected.label + (selected.suffix || '') : placeholder}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={listRef}
          className="fixed z-[200] glass border border-border rounded-xl shadow-2xl overflow-hidden min-w-[280px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: listPos.top, left: listPos.left, width: listPos.width }}
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between transition-colors
                  ${String(option.value) === String(value)
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-text hover:bg-hover'
                  }`}
              >
                <span className="whitespace-nowrap">{option.label}</span>
                {option.suffix && (
                  <span className="text-xs text-text-secondary ml-2 flex-shrink-0">{option.suffix}</span>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}