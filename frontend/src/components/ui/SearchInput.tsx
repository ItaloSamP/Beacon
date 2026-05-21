import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  onClear,
  placeholder = 'Search...',
  debounceMs,
  disabled = false,
  autoFocus = false,
  'aria-label': ariaLabel = 'Search',
  className = '',
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when controlled value changes externally
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const fireChange = useCallback(
    (newValue: string) => {
      if (!onChange) return;

      if (debounceMs) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onChange(newValue);
        }, debounceMs);
      } else {
        onChange(newValue);
      }
    },
    [onChange, debounceMs],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clearInput = useCallback(() => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    if (onClear) {
      onClear();
    }
    // Cancel any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Always fire onChange with empty string
    if (onChange) {
      onChange('');
    }
    // Ensure input retains focus after clear
    inputRef.current?.focus();
  }, [controlledValue, onChange, onClear]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      fireChange(newValue);
    },
    [controlledValue, fireChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        const currentInputValue = (e.target as HTMLInputElement).value;
        if (currentInputValue) {
          e.preventDefault();
          clearInput();
        }
      }
    },
    [clearInput],
  );

  const currentValue = controlledValue ?? internalValue;

  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        type="search"
        role="textbox"
        aria-label={ariaLabel}
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {currentValue && !disabled && (
        <button
          type="button"
          onClick={clearInput}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
