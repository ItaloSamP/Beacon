import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'p-6' : 'p-12'} ${className}`}
    >
      {icon ? (
        <div className={compact ? 'mb-3' : 'mb-4'}>
          {icon}
        </div>
      ) : (
        <FolderOpen
          size={compact ? 32 : 48}
          className={`text-gray-300 ${compact ? 'mb-3' : 'mb-4'}`}
          aria-hidden="true"
        />
      )}

      <h3
        className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}
      >
        {title}
      </h3>

      {description && (
        <p
          className={`text-gray-500 mt-1 ${compact ? 'text-sm max-w-xs' : 'text-sm max-w-md'}`}
        >
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${compact ? 'mt-3' : 'mt-6'}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
