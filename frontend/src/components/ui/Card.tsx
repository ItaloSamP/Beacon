import React from 'react';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  hoverable = false,
  onClick,
}: CardProps) {
  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const hoverClasses = hoverable
    ? 'hover:shadow-md transition-shadow cursor-pointer'
    : '';
  const clickClasses = onClick ? 'cursor-pointer' : '';

  const classes = [
    'bg-white rounded-xl border border-gray-200 shadow-sm',
    paddingClasses[padding] || paddingClasses.md,
    hoverClasses,
    clickClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
          onClick();
        }
      }
    : undefined;

  return (
    <div
      className={classes}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </div>
  );
}
