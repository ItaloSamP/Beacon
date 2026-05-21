import React from 'react';

interface ComparisonBoxProps {
  label: string;
  baseline: number;
  current: number;
  unit?: string;
  compact?: boolean;
  isImprovement?: 'higher' | 'lower';
  className?: string;
}

export function ComparisonBox({
  label,
  baseline,
  current,
  unit = '',
  compact = false,
  isImprovement = 'higher',
  className = '',
}: ComparisonBoxProps) {
  // Calculate percentage change
  const delta = baseline !== 0
    ? ((current - baseline) / baseline) * 100
    : 0;

  const absDelta = Math.abs(delta);
  const roundedDelta = Math.round(absDelta);
  const isZero = roundedDelta === 0;
  const isIncrease = delta > 0;

  // Determine if this is an improvement or degradation
  let isGood: boolean;
  if (isImprovement === 'lower') {
    // Lower is better, so decrease = good, increase = bad
    isGood = !isIncrease && !isZero;
  } else {
    // Higher is better (default), so increase = good, decrease = bad
    isGood = isIncrease;
  }

  const deltaColor = isZero
    ? 'text-muted-foreground'
    : isGood
      ? 'text-green-600'
      : 'text-red-600';

  const arrow = isIncrease ? '\u25B2' : isZero ? '' : '\u25BC';
  const sign = isIncrease ? '+' : isZero ? '' : '-';

  // Compact variant
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {current}{unit}
        </span>
        {!isZero && (
          <span className={`text-xs font-medium ${deltaColor}`}>
            {arrow} {sign}{roundedDelta}%
          </span>
        )}
        {isZero && (
          <span className="text-xs text-muted-foreground">0%</span>
        )}
      </div>
    );
  }

  // Full variant — unit displayed as a standalone label to avoid duplicate text matches
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm font-medium text-foreground">
        {label}
        {unit && <span className="text-xs text-muted-foreground ml-1">({unit})</span>}
      </p>

      <div className="flex items-baseline gap-3">
        {/* Baseline */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Baseline</span>
          <span className="text-lg font-semibold tabular-nums">
            {baseline}
          </span>
        </div>

        {/* Arrow */}
        <span className="text-muted-foreground">{'\u2192'}</span>

        {/* Current */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Current</span>
          <span className="text-lg font-semibold tabular-nums">
            {current}
          </span>
        </div>

        {/* Delta */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Change</span>
          <span className={`text-lg font-semibold tabular-nums ${deltaColor}`}>
            {isZero ? (
              '0%'
            ) : (
              <>{arrow} {sign}{roundedDelta}%</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
