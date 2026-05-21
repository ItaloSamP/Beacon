import React from 'react';

interface StatusDotProps {
  variant?: 'online' | 'offline' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const variantConfig: Record<
  string,
  { bg: string; label: string }
> = {
  online: { bg: 'bg-green-500', label: 'Online' },
  offline: { bg: 'bg-gray-400', label: 'Offline' },
  warning: { bg: 'bg-yellow-500', label: 'Warning' },
  error: { bg: 'bg-red-500', label: 'Error' },
};

const sizeConfig: Record<string, string> = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusDot({
  variant = 'offline',
  size = 'md',
  label,
  className = '',
}: StatusDotProps) {
  const config = variantConfig[variant];
  const sizeClass = sizeConfig[size];

  const ariaLabel = label || config.label;

  const dotElement = (
    <span className="relative inline-flex">
      {/* Dot comes FIRST so querySelector('[class*="rounded-full"]') finds it */}
      <span
        className={`relative inline-block rounded-full ${sizeClass} ${config.bg}`}
        aria-label={ariaLabel}
      />
      {variant === 'online' && (
        <span
          className={`absolute top-0 left-0 inline-flex h-full w-full rounded-full ${config.bg} opacity-75 animate-ping`}
          aria-hidden="true"
        />
      )}
    </span>
  );

  if (label) {
    return (
      <span
        className={`inline-flex items-center gap-2 ${className}`}
        aria-label={ariaLabel}
      >
        {dotElement}
        <span className="text-sm text-gray-700">{label}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${className}`} aria-label={ariaLabel}>
      {dotElement}
    </span>
  );
}
