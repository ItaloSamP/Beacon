import React from 'react';

interface ZScoreDisplayProps {
  value: number;
  label?: string;
  compact?: boolean;
  className?: string;
}

function formatValue(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // Truncate to 1 decimal place (matching test expectations for 2.75 → 2.7)
  const sign = value < 0 ? -1 : 1;
  const truncated = Math.floor(Math.abs(value) * 10) / 10 * sign;
  return truncated.toFixed(1);
}

function getSeverityClass(absValue: number, compact: boolean): string {
  if (absValue < 2) {
    return compact
      ? 'text-green-600'
      : 'text-green-700 bg-green-50';
  }
  if (absValue <= 3) {
    return compact
      ? 'text-yellow-600'
      : 'text-yellow-700 bg-yellow-50';
  }
  return compact
    ? 'text-red-600'
    : 'text-red-700 bg-red-50';
}

export function ZScoreDisplay({
  value,
  label,
  compact = false,
  className = '',
}: ZScoreDisplayProps) {
  const absValue = Math.abs(value);
  const severityClass = getSeverityClass(absValue, compact);
  const formattedValue = formatValue(value);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        {label && (
          <span className="text-xs text-gray-500 font-medium">{label}</span>
        )}
        <span className={`text-sm font-bold ${severityClass}`}>
          {formattedValue}
        </span>
      </span>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      {label && (
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </span>
      )}
      <span
        className={`px-3 py-1.5 rounded-lg text-lg font-bold font-mono ${severityClass}`}
      >
        {formattedValue}
      </span>
    </div>
  );
}
