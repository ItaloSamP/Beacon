import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white';
  className?: string;
  'aria-label'?: string;
}

export function Spinner({
  size = 'md',
  variant = 'primary',
  className = '',
  'aria-label': ariaLabel = 'Loading',
}: SpinnerProps) {
  const sizes: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const variants: Record<string, string> = {
    primary: 'text-primary',
    white: 'text-white',
  };

  return (
    <span
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`animate-spin inline-block ${sizes[size]} ${variants[variant]} ${className}`}
    >
      <Loader2 className="w-full h-full" aria-hidden="true" />
    </span>
  );
}
