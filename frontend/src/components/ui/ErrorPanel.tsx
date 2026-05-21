import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorPanelProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  errorCode?: string;
  variant?: 'error' | 'warning';
  className?: string;
}

export function ErrorPanel({
  message,
  onRetry,
  onDismiss,
  errorCode,
  variant = 'error',
  className = '',
}: ErrorPanelProps) {
  const isWarning = variant === 'warning';

  const containerClasses = isWarning
    ? 'bg-yellow-50 border border-yellow-200 rounded-lg'
    : 'bg-red-50 border border-red-200 rounded-lg';

  const iconClasses = isWarning ? 'text-yellow-500' : 'text-red-500';
  const textClasses = isWarning ? 'text-yellow-800' : 'text-red-800';
  const codeClasses = isWarning
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';

  const retryButtonClasses = isWarning
    ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
    : 'text-red-700 bg-red-100 hover:bg-red-200';

  const dismissButtonClasses = isWarning
    ? 'text-yellow-500 hover:text-yellow-700'
    : 'text-red-500 hover:text-red-700';

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 ${containerClasses} ${className}`}
    >
      <AlertTriangle
        size={20}
        className={`flex-shrink-0 mt-0.5 ${iconClasses}`}
        aria-hidden="true"
      />

      <div className={`flex-1 min-w-0 ${isWarning ? 'bg-yellow-50' : 'bg-red-50'}`}>
        <p className={`text-sm font-medium ${textClasses}`}>{message}</p>

        {errorCode && (
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-mono font-medium rounded ${codeClasses}`}
          >
            {errorCode}
          </span>
        )}

        {(onRetry || onDismiss) && (
          <div className="mt-3 flex items-center gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${retryButtonClasses}`}
              >
                Try Again
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss"
                className={`p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${dismissButtonClasses}`}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
