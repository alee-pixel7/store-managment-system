// AliasInput Component
// Input field that allows adding multiple aliases as chips/tags

import { useState, KeyboardEvent } from 'react';

interface AliasInputProps {
  aliases: string[];
  onChange: (aliases: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AliasInput({
  aliases,
  onChange,
  placeholder = 'Type alias and press Enter',
  disabled = false,
}: AliasInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addAlias();
    } else if (e.key === 'Backspace' && inputValue === '' && aliases.length > 0) {
      // Remove last alias when backspace on empty input
      onChange(aliases.slice(0, -1));
    }
  };

  const addAlias = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !aliases.includes(trimmed.toUpperCase())) {
      onChange([...aliases, trimmed.toUpperCase()]);
    }
    setInputValue('');
  };

  const removeAlias = (index: number) => {
    onChange(aliases.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-1.5 border border-border rounded bg-surface min-h-[38px] focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
      {aliases.map((alias, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-dim text-accent-text text-sm font-mono rounded"
        >
          {alias}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeAlias(index)}
              className="text-accent hover:text-accent-hover font-bold"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addAlias}
          placeholder={aliases.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm font-mono bg-transparent"
        />
      )}
    </div>
  );
}
