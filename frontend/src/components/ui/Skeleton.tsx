import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200';

  const variantClasses: Record<string, string> = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const getStyle = (index: number): React.CSSProperties => {
    const style: React.CSSProperties = {};

    if (width) {
      style.width = width;
    }
    if (height) {
      style.height = height;
    }

    // For text variant with multiple lines, stagger widths to simulate text block
    if (variant === 'text' && count > 1 && !width) {
      if (index === count - 1) {
        // Last line is shorter (about 60% width)
        style.width = '60%';
      }
    }

    // Default sizing for circular variant without explicit dimensions
    if (variant === 'circular' && !width && !height) {
      style.width = '40px';
      style.height = '40px';
    }

    return style;
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      aria-busy="true"
      aria-hidden="true"
      className={`${baseClasses} ${variantClasses[variant]} ${i > 0 ? 'mt-2' : ''}`}
      style={getStyle(i)}
    />
  ));

  if (count === 1) {
    return (
      <div
        aria-busy="true"
        aria-hidden="true"
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={getStyle(0)}
      />
    );
  }

  return <div className={`space-y-0 ${className}`}>{items}</div>;
}
