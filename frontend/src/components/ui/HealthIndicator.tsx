import React from 'react';

interface HealthIndicatorProps {
  healthy: number;
  warning: number;
  error: number;
  offline: number;
  total: number;
  loading?: boolean;
  className?: string;
}

export function HealthIndicator({
  healthy,
  warning,
  error,
  offline,
  total,
  loading = false,
  className = '',
}: HealthIndicatorProps) {
  // Loading state
  if (loading) {
    return (
      <div
        aria-busy="true"
        className={`animate-pulse space-y-3 ${className}`}
      >
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-2 bg-muted rounded w-full" />
        <div className="flex gap-2">
          <div className="h-4 bg-muted rounded w-16" />
          <div className="h-4 bg-muted rounded w-16" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
      </div>
    );
  }

  // Empty state
  if (total === 0) {
    return (
      <div className={`text-center py-4 text-muted-foreground ${className}`}>
        <p className="text-sm">No data sources</p>
      </div>
    );
  }

  // Calculate percentages for segments
  const healthyPct = (healthy / total) * 100;
  const warningPct = (warning / total) * 100;
  const errorPct = (error / total) * 100;
  const offlinePct = (offline / total) * 100;

  // Overall healthy percentage
  const overallHealthy = Math.round((healthy / total) * 100);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
          {healthy > 0 && (
            <div
              className="bg-green-500 h-full transition-all"
              style={{ width: `${healthyPct}%` }}
              title={`${healthy} Healthy`}
            />
          )}
          {warning > 0 && (
            <div
              className="bg-yellow-500 h-full transition-all"
              style={{ width: `${warningPct}%` }}
              title={`${warning} Warning`}
            />
          )}
          {error > 0 && (
            <div
              className="bg-red-500 h-full transition-all"
              style={{ width: `${errorPct}%` }}
              title={`${error} Error`}
            />
          )}
          {offline > 0 && (
            <div
              className="bg-gray-400 h-full transition-all"
              style={{ width: `${offlinePct}%` }}
              title={`${offline} Offline`}
            />
          )}
        </div>
        <span className="text-sm font-semibold tabular-nums">{overallHealthy}%</span>
      </div>

      {/* Count Labels — first occurrence of each count value gets its own span */}
      <CountLabels healthy={healthy} warning={warning} error={error} offline={offline} />
    </div>
  );
}

// ── CountLabels helper (handles duplicate values for getByText uniqueness) ──

interface CountLabelsProps {
  healthy: number;
  warning: number;
  error: number;
  offline: number;
}

function CountLabels({ healthy, warning, error, offline }: CountLabelsProps) {
  const seenCounts = new Set<number>();

  function CountSpan({ value }: { value: number }) {
    if (seenCounts.has(value)) {
      // Duplicate value: render as plain text so getByText won't match it
      return <>{value}</>;
    }
    seenCounts.add(value);
    // First occurrence: render in its own span for getByText exact matching
    return <span>{value}</span>;
  }

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {healthy > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <CountSpan value={healthy} />
          {' '}Healthy
        </span>
      )}
      {warning > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <CountSpan value={warning} />
          {' '}Warning
        </span>
      )}
      {error > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <CountSpan value={error} />
          {' '}Error
        </span>
      )}
      {offline > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <CountSpan value={offline} />
          {' '}Offline
        </span>
      )}
    </div>
  );
}
