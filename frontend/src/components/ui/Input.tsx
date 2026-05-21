import React, { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className = '',
  id: idProp,
  type = 'text',
  disabled,
  onChange,
  value,
  defaultValue,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = idProp || autoId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const inputClasses = [
    'w-full px-3 py-2 border rounded-lg text-sm transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
    error
      ? 'border-danger focus:ring-danger focus:border-danger'
      : 'border-gray-300',
    disabled ? 'opacity-50 bg-gray-100 cursor-not-allowed' : '',
    icon ? 'pl-10' : '',
    isPassword ? 'pr-10' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const ariaDescribedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          type={inputType}
          className={inputClasses}
          disabled={disabled}
          onChange={onChange}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={ariaDescribedBy}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label="Toggle visibility"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
