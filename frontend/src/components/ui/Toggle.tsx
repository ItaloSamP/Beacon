import React, { useCallback } from 'react';

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function Toggle({
  checked = false,
  onChange,
  label,
  disabled = false,
  'aria-label': ariaLabel,
  className = '',
}: ToggleProps) {
  const handleToggle = useCallback(() => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  }, [checked, disabled, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  const switchButton = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (label) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <label
          className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={(e) => {
            // Don't double-fire since the button already handles click
            if (e.target === e.currentTarget) {
              handleToggle();
            }
          }}
        >
          {switchButton}
          <span className="text-sm text-gray-700 select-none">{label}</span>
        </label>
      </div>
    );
  }

  return (
    <div className={className}>
      {switchButton}
    </div>
  );
}
