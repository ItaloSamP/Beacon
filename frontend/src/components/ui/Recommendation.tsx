import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface RecommendationProps {
  title: string;
  description: string;
  severity?: 'critical' | 'warning' | 'info' | 'default';
  actionLabel?: string;
  onAction?: () => void;
  detail?: string;
  className?: string;
}

const severityStyles = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50/50',
    icon: 'text-red-500',
  },
  warning: {
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-50/50',
    icon: 'text-yellow-500',
  },
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50/50',
    icon: 'text-blue-500',
  },
  default: {
    border: 'border-l-gray-300',
    bg: 'bg-gray-50/50',
    icon: 'text-gray-500',
  },
};

export function Recommendation({
  title,
  description,
  severity = 'default',
  actionLabel,
  onAction,
  detail,
  className = '',
}: RecommendationProps) {
  const [expanded, setExpanded] = useState(false);
  const styles = severityStyles[severity];

  const toggleExpand = () => setExpanded((prev) => !prev);

  return (
    <div
      className={`border border-border border-l-4 ${styles.border} ${styles.bg} rounded-md p-4 space-y-2 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Lightbulb className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      {/* Footer: Action + Toggle */}
      <div className="flex items-center justify-between pt-1">
        {/* Action Button */}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-xs font-medium text-primary hover:text-primary/80 underline"
          >
            {actionLabel}
          </button>
        )}

        {/* Expand Toggle */}
        {detail && (
          <button
            type="button"
            onClick={toggleExpand}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>{expanded ? 'Less' : 'More'}</span>
          </button>
        )}
      </div>

      {/* Expandable Detail */}
      {detail && expanded && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
      )}
    </div>
  );
}
