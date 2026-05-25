import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusDot } from '../../components/ui/StatusDot';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { api } from '../../lib/api';
import type { DataSource, DataSourceTimelineEntry, ActivePipeline, RecentAnomalyItem } from '../../types/datasource';
import type { ApiResponse } from '../../types/api';
import { Pencil } from 'lucide-react';

const SEVERITY_BAR_COLORS: Record<string, string> = {
  low: 'rgba(202, 138, 4, 0.5)',
  medium: '#ca8a04',
  high: 'rgba(220, 38, 38, 0.75)',
  critical: '#dc2626',
};

const SEVERITY_DOT_COLORS: Record<string, string> = {
  low: '#2563eb',
  medium: '#ca8a04',
  high: '#f97316',
  critical: '#dc2626',
};

const SEVERITY_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'critical' | 'info'> = {
  low: 'info',
  medium: 'warning',
  high: 'danger',
  critical: 'critical',
};

const TYPE_LABEL_MAP: Record<string, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  bigquery: 'BigQuery',
  google_sheets: 'Google Sheets',
};

function toRelativeTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function AnomalyTimelineChart({ timeline }: { timeline: DataSourceTimelineEntry[] }) {
  const maxCount = Math.max(...timeline.map((t) => t.count), 1);
  const totalCount = timeline.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold">Anomalies in the last 30 days</h3>
        <Badge variant={totalCount > 0 ? 'warning' : 'default'} size="sm">
          {totalCount} anomal{totalCount !== 1 ? 'ies' : 'y'}
        </Badge>
      </div>
      <div
        role="img"
        aria-label={`Chart showing ${totalCount} anomalies over the last 30 days`}
        className="relative h-[200px] flex items-end gap-1 border-b border-gray-200 pb-2"
      >
        {timeline.map((entry, i) => {
          const heightPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
          const color =
            entry.maxSeverity && SEVERITY_BAR_COLORS[entry.maxSeverity]
              ? SEVERITY_BAR_COLORS[entry.maxSeverity]
              : 'rgba(229, 231, 235, 0.6)';
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm min-w-[4px] transition-opacity hover:opacity-75"
              style={{ height: `${Math.max(heightPct, 2)}%`, backgroundColor: color }}
              title={`${entry.date}: ${entry.count} anomal${entry.count !== 1 ? 'ies' : 'y'}${entry.maxSeverity ? ` (max: ${entry.maxSeverity})` : ''}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>30 days ago</span>
        <span>15 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function ActivePipelinesSection({ pipelines }: { pipelines: ActivePipeline[] }) {
  const pipelineStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'failed':
      case 'error':
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Active Pipelines</h3>
        <Badge variant="info" size="sm">
          {pipelines.length} active
        </Badge>
      </div>
      <div>
        {pipelines.map((pipeline) => (
          <Link
            key={pipeline.id}
            to={`/pipelines/${pipeline.id}/runs`}
            className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">{pipeline.name}</div>
              <div className="text-xs text-gray-500 mt-1">{pipeline.description}</div>
            </div>
            <Badge variant={pipelineStatusVariant(pipeline.status)} size="sm">
              {pipeline.status}
            </Badge>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RecentAnomaliesSection({ anomalies }: { anomalies: RecentAnomalyItem[] }) {
  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent Anomalies</h3>
        <Link
          to="/anomalies"
          className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          View all
        </Link>
      </div>
      <div>
        {anomalies.map((anomaly) => (
          <Link
            key={anomaly.id}
            to={`/anomalies/${anomaly.id}`}
            className="flex items-center gap-4 px-6 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: SEVERITY_DOT_COLORS[anomaly.severity] || '#9ca3af' }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {anomaly.type}: {anomaly.description}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {anomaly.severity} — {toRelativeTime(anomaly.detected_at)}
              </div>
            </div>
            <Badge
              variant={anomaly.resolved_at ? 'success' : SEVERITY_BADGE_VARIANT[anomaly.severity] || 'default'}
              size="sm"
            >
              {anomaly.resolved_at ? 'Resolved' : anomaly.severity}
            </Badge>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function ConfigurationSection({ ds }: { ds: DataSource }) {
  const lastHeartbeat = ds.last_profiled_at || ds.updated_at;
  const heartbeatDot: 'online' | 'offline' | 'warning' | 'error' =
    ds.status === 'active' ? 'online' : ds.status === 'error' ? 'error' : 'offline';

  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold">Configuration</h3>
      </div>
      <div className="p-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Type</div>
          <div className="text-sm text-gray-900">{TYPE_LABEL_MAP[ds.type] || ds.type}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Agent</div>
          <div className="text-sm text-gray-900">{ds.agent?.name || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Host</div>
          <div className="text-sm text-gray-900 font-mono">{ds.host || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Created At</div>
          <div className="text-sm text-gray-900">{formatDate(ds.created_at)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Pipelines</div>
          <div className="text-sm text-gray-900">
            {ds.pipelines_count != null ? `${ds.pipelines_count} active` : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Last Heartbeat</div>
          <div className="flex items-center gap-2">
            <StatusDot variant={heartbeatDot} size="sm" />
            <span className="text-sm text-gray-900">{toRelativeTime(lastHeartbeat)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DataSourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['datasource', id],
    queryFn: () => api.get<ApiResponse<DataSource>>(`/datasources/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton width="200px" height="20px" className="mb-4" />
        <Skeleton width="300px" height="32px" className="mb-2" />
        <Skeleton width="100%" height="16px" className="mb-6" />
        <div className="grid grid-cols-[2fr_1fr] gap-6">
          <div>
            <Skeleton variant="rectangular" height="280px" className="mb-6" />
            <Skeleton variant="rectangular" height="200px" />
          </div>
          <div>
            <Skeleton variant="rectangular" height="200px" className="mb-6" />
            <Skeleton variant="rectangular" height="200px" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorPanel
        message={error instanceof Error ? error.message : 'Failed to load data source.'}
        onRetry={() => navigate(0)}
      />
    );
  }

  const ds = data?.data;

  if (!ds) {
    return (
      <EmptyState
        title="Data source not found"
        description="The requested data source could not be found."
        compact
      />
    );
  }

  const timeline: DataSourceTimelineEntry[] = ds.timeline || [];
  const activePipelines: ActivePipeline[] = ds.active_pipelines || [];
  const recentAnomalies: RecentAnomalyItem[] = ds.recent_anomalies || [];

  const statusDotVariant: 'online' | 'offline' | 'error' | 'warning' =
    ds.status === 'active' ? 'online' : ds.status === 'error' ? 'error' : 'offline';
  const statusLabel = ds.status === 'active' ? 'Active' : ds.status === 'error' ? 'Connection Error' : 'Inactive';

  return (
    <div>
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item href="/datasources">Data Sources</Breadcrumb.Item>
        <Breadcrumb.Item isCurrentPage>{ds.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">{ds.name}</h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <StatusDot variant={statusDotVariant} size="sm" />
              <span className="text-sm text-gray-600">{statusLabel}</span>
            </div>
            <span className="text-sm text-gray-400">
              {TYPE_LABEL_MAP[ds.type] || ds.type}
            </span>
            <span className="text-sm text-gray-400">
              Last check: {toRelativeTime(ds.last_profiled_at || ds.updated_at)}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/datasources/${ds.id}/edit`)}
        >
          <Pencil size={14} className="mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="flex flex-col gap-6">
          <AnomalyTimelineChart timeline={timeline} />
          <ActivePipelinesSection pipelines={activePipelines} />
        </div>
        <div className="flex flex-col gap-6">
          <RecentAnomaliesSection anomalies={recentAnomalies} />
          <ConfigurationSection ds={ds} />
        </div>
      </div>
    </div>
  );
}
