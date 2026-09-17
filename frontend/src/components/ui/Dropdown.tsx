// Dropdown Component
// Custom dropdown to replace native <select> — no z-index/blur issues

import { useState, useRef, useEffect } from 'react';

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
}

export function Dropdown({ options, value, onChange, placeholder = 'Select...', className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-1.5 text-sm border border-border rounded bg-base text-text hover:border-accent/50 focus:ring-1 focus:ring-accent focus:border-accent min-h-[44px] sm:min-h-0 text-left transition-colors"
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

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
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
                    : 'text-text hover:bg-elevated'
                  }`}
              >
                <span className="truncate">{option.label}</span>
                {option.suffix && (
                  <span className="text-xs text-text-secondary ml-2 flex-shrink-0">{option.suffix}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
