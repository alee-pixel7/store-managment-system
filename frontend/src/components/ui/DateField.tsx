// DateField Component
// Day-first date input + dark calendar popup (replaces native type="date")
//
// - Typing: "29-09-2026", "29/09/2026", "29 Sep 2026" all accepted (parseDayFirst)
// - Display: "29 Sep 2026" (day-first) when not focused
// - Value contract (like native input[type=date]): ISO "YYYY-MM-DD" or ""
// - Calendar: portal-rendered (no overflow clipping), month nav, today ring,
//   violet selected day, click-outside + Escape close

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MONTHS_SHORT, formatDate, parseDayFirst, todayISO, toDate } from '../../lib/dates';

interface DateFieldProps {
  value: string; // ISO YYYY-MM-DD or ''
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
}

interface Cell {
  day: number;
  iso: string;
  otherMonth: boolean;
  isToday: boolean;
}

function buildGrid(viewYear: number, viewMonth: number): Cell[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7; // week starts Monday
  const today = todayISO();
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(viewYear, viewMonth, 1 - startOffset + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    cells.push({
      day: d.getDate(),
      iso,
      otherMonth: d.getMonth() !== viewMonth,
      isToday: iso === today,
    });
  }
  return cells;
}

export function DateField({ value, onChange, className = '', disabled = false }: DateFieldProps) {
  const [text, setText] = useState(() => (value ? formatDate(value) : ''));
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  const anchorRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep text in sync when value changes externally (reset forms)
  useEffect(() => {
    if (!focused) setText(value ? formatDate(value) : '');
  }, [value, focused]);

  const [view, setView] = useState(() => {
    const d = toDate(value) || new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  // Re-sync the calendar view whenever the value changes
  useEffect(() => {
    const d = toDate(value);
    if (d) setView({ y: d.getFullYear(), m: d.getMonth() });
  }, [value]);

  const updatePos = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const height = 300;
    // Open upward if not enough space below
    const below = window.innerHeight - rect.bottom;
    const top = below < height + 12 ? Math.max(8, rect.top - height - 6) : rect.bottom + 6;
    setPopupPos({ top, left: Math.min(rect.left, window.innerWidth - 300) });
  }, []);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setOpen(prev => {
      if (!prev) requestAnimationFrame(updatePos);
      return !prev;
    });
  }, [disabled, updatePos]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape closes popup (and blurs input)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Recalc on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const recalc = () => updatePos();
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [open, updatePos]);

  const commitText = (raw: string) => {
    if (!raw.trim()) {
      onChange('');
      setText('');
      return;
    }
    const iso = parseDayFirst(raw);
    if (iso) {
      onChange(iso);
      setText(formatDate(iso));
    } else {
      // Invalid input — snap back to last good value
      setText(value ? formatDate(value) : '');
    }
  };

  const pickDate = (iso: string) => {
    onChange(iso);
    setText(formatDate(iso));
    setOpen(false);
    inputRef.current?.focus();
  };

  const shiftMonth = (delta: number) => {
    setView(prev => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const shiftYear = (delta: number) => {
    setView(prev => ({ y: prev.y + delta, m: prev.m }));
  };

  const cells = buildGrid(view.y, view.m);

  return (
    <div ref={anchorRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="DD-MM-YYYY"
          disabled={disabled}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            // Live-parse complete inputs while typing
            const iso = parseDayFirst(raw);
            if (iso) onChange(iso);
          }}
          onFocus={(e) => {
            setFocused(true);
            // Select all for quick overwrite
            requestAnimationFrame(() => e.target.select());
          }}
          onBlur={() => {
            setFocused(false);
            commitText(text);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitText(text);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === 'ArrowDown' && e.altKey) {
              e.preventDefault();
              handleToggle();
            }
          }}
          className="flex-1 px-4 py-2.5 text-sm bg-transparent outline-none min-h-[44px] font-mono text-text placeholder:text-text-muted"
        />
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Pick date"
          className="px-2.5 py-2 text-text-secondary hover:text-accent transition-colors disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </button>
      </div>

      {open && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[200] w-[288px] glass border border-border rounded-xl shadow-2xl p-3 select-none"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          {/* Header: month nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftYear(-1)}
              className="p-1.5 text-text-secondary hover:text-accent transition-colors"
              aria-label="Previous year"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 0l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1.5 text-text-secondary hover:text-accent transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-text">
              {MONTHS_SHORT[view.m]} {view.y}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1.5 text-text-secondary hover:text-accent transition-colors"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => shiftYear(1)}
              className="p-1.5 text-text-secondary hover:text-accent transition-colors"
              aria-label="Next year"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="text-[10px] font-semibold text-text-muted text-center uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(cell => {
              const isSelected = !!value && cell.iso === value;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => pickDate(cell.iso)}
                  className={[
                    'h-8 text-xs rounded-lg transition-colors relative',
                    cell.otherMonth ? 'text-text-muted/40 hover:text-text-secondary' : 'text-text',
                    isSelected
                      ? 'bg-accent text-base font-bold shadow-[0_0_10px_rgba(139,92,246,0.35)]'
                      : cell.isToday
                        ? 'ring-1 ring-accent/70 text-accent font-semibold hover:bg-accent/10'
                        : 'hover:bg-hover',
                  ].join(' ')}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer: today / clear */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light">
            <button
              type="button"
              onClick={() => pickDate(todayISO())}
              className="text-xs text-accent hover:underline font-medium"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setText('');
                setOpen(false);
              }}
              className="text-xs text-text-secondary hover:text-danger transition-colors"
            >
              Clear
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
