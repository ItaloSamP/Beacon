import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'critical';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  const variantClasses: Record<string, string> = {
    success: 'bg-success-light text-success-dark',
    warning: 'bg-warning-light text-warning-dark',
    danger: 'bg-danger-light text-danger-dark',
    info: 'bg-blue-100 text-blue-800',
    default: 'bg-gray-100 text-gray-800',
    critical: 'bg-critical-light text-critical',
  };

  const dotColors: Record<string, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-blue-600',
    default: 'bg-gray-500',
    critical: 'bg-critical',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
  };

  const classes = [
    'inline-flex items-center font-medium rounded-full',
    variantClasses[variant] || variantClasses.default,
    sizeClasses[size] || sizeClasses.md,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {dot && (
        <span
          className={`inline-block h-2 w-2 rounded-full mr-1.5 ${dotColors[variant] || dotColors.default}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
