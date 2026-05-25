import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatusDot } from '../components/ui/StatusDot';
import { HealthIndicator } from '../components/ui/HealthIndicator';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorPanel } from '../components/ui/ErrorPanel';
import { api } from '../lib/api';
import type { PaginatedResponse } from '../types/api';
import type { DataSource } from '../types/datasource';
import type { Anomaly } from '../types/anomaly';
import type { PipelineRun } from '../types/pipeline_run';
import { Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

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

const TYPE_LABEL_MAP: Record<string, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  bigquery: 'BigQuery',
  google_sheets: 'Google Sheets',
};

function statusDotVariant(status: string): 'online' | 'offline' | 'warning' | 'error' {
  const map: Record<string, 'online' | 'offline' | 'warning' | 'error'> = {
    active: 'online',
    error: 'error',
    inactive: 'offline',
  };
  return map[status] || 'offline';
}

type FeedIcon = 'anomaly' | 'pipeline_success' | 'pipeline_error';

interface FeedItem {
  type: 'anomaly' | 'pipeline_run';
  id: string;
  timestamp: string;
  title: string;
  description: string;
  icon: FeedIcon;
  linkTo: string;
}

export function DashboardPage() {
  const queryClient = useQueryClient();

  const {
    data: healthData,
    isLoading: healthLoading,
    isError: healthError,
    error: healthErrorObj,
  } = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: () =>
      api.get<{
        data: { total: number; healthy: number; warning: number; error: number; offline: number };
        error: null;
      }>('/datasources/health'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const {
    data: dsData,
    isLoading: dsLoading,
    isError: dsError,
    error: dsErrorObj,
  } = useQuery({
    queryKey: ['dashboard', 'datasources'],
    queryFn: () => api.get<PaginatedResponse<DataSource>>('/datasources'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const {
    data: anomaliesData,
    isLoading: anomaliesLoading,
    isError: anomaliesError,
    error: anomaliesErrorObj,
  } = useQuery({
    queryKey: ['dashboard', 'anomalies-recent'],
    queryFn: () =>
      api.get<{ data: Anomaly[]; meta: { total: number }; error: null }>(
        '/anomalies/recent?limit=10',
      ),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const {
    data: runsData,
    isLoading: runsLoading,
    isError: runsError,
    error: runsErrorObj,
  } = useQuery({
    queryKey: ['dashboard', 'runs-recent'],
    queryFn: () =>
      api.get<{ data: PipelineRun[]; meta: { total: number }; error: null }>(
        '/pipeline-runs/recent?limit=10',
      ),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const health = healthData?.data;
  const dataSources = dsData?.data ?? [];
  const anomalies = anomaliesData?.data ?? [];
  const runs = runsData?.data ?? [];

  const feedItems: FeedItem[] = useMemo(() => {
    const anomalyItems: FeedItem[] = anomalies.map((a) => ({
      type: 'anomaly' as const,
      id: a.id,
      timestamp: a.detected_at,
      title: `Anomaly: ${a.type}`,
      description: a.description,
      icon: 'anomaly' as FeedIcon,
      linkTo: `/anomalies/${a.id}`,
    }));

    const runItems: FeedItem[] = runs.map((r) => ({
      type: 'pipeline_run' as const,
      id: r.id,
      timestamp: r.started_at,
      title: r.pipeline?.name ?? r.pipeline_id,
      description: `Status: ${r.status}`,
      icon: (
        r.status === 'success'
          ? 'pipeline_success'
          : r.status === 'error'
            ? 'pipeline_error'
            : 'pipeline_success'
      ) as FeedIcon,
      linkTo: `/pipelines/${r.pipeline_id}/runs`,
    }));

    return [...anomalyItems, ...runItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [anomalies, runs]);

  const healthBorderColor = useMemo(() => {
    if (!health) return 'border-l-gray-200';
    if (health.offline > 0) return 'border-l-gray-400';
    if (health.error > 0) return 'border-l-red-500';
    if (health.warning > 0) return 'border-l-yellow-500';
    return 'border-l-green-500';
  }, [health]);

  return (
    <div data-testid="dashboard">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link to="/datasources/new">
          <Button size="sm">
            <Plus size={16} className="mr-1" />+ Novo Data Source
          </Button>
        </Link>
      </div>

      <section aria-label="Health indicator" className="mb-8">
        {healthLoading ? (
          <Card className="p-6">
            <div className="flex items-center gap-6">
              <div>
                <Skeleton variant="text" width="80px" height="32px" />
                <div className="mt-2">
                  <Skeleton variant="text" width="120px" height="14px" />
                </div>
              </div>
              <div className="flex-1">
                <Skeleton variant="rectangular" height="12px" />
              </div>
              <div className="flex gap-4">
                <Skeleton variant="text" width="80px" />
                <Skeleton variant="text" width="80px" />
              </div>
            </div>
          </Card>
        ) : healthError ? (
          <ErrorPanel
            message={healthErrorObj instanceof Error ? healthErrorObj.message : 'Failed to load health data'}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'health'] })}
          />
        ) : health ? (
          <div className={`bg-white border rounded-xl shadow-sm p-5 border-l-4 ${healthBorderColor}`}>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <div className="text-3xl font-extrabold leading-none text-gray-900">
                  {health.healthy}
                  <span className="font-normal text-gray-400 mx-0.5">/</span>
                  {health.total}
                </div>
                <div className="text-sm font-medium text-gray-500 mt-1">Data sources healthy</div>
              </div>
              <div className="flex-1 min-w-[120px]">
                <HealthIndicator
                  healthy={health.healthy}
                  warning={health.warning}
                  error={health.error}
                  offline={health.offline}
                  total={health.total}
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="ds-heading" className="mb-8">
        <h2 id="ds-heading" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Data Sources
        </h2>

        {dsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton variant="text" width="60%" height="20px" />
                <div className="mt-2">
                  <Skeleton variant="text" width="40%" height="12px" />
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton variant="text" height="12px" />
                  <Skeleton variant="text" height="12px" />
                </div>
              </Card>
            ))}
          </div>
        ) : dsError ? (
          <ErrorPanel
            message={dsErrorObj instanceof Error ? dsErrorObj.message : 'Failed to load data sources'}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'datasources'] })}
          />
        ) : dataSources.length === 0 ? (
          <EmptyState
            title="Nenhum data source configurado"
            description="Conecte seu primeiro banco de dados para começar a monitorar anomalias."
            action={{
              label: 'Conectar Data Source',
              onClick: () => {
                window.location.href = '/datasources/new';
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dataSources.map((ds) => {
              const activeAnomalies = ds.active_anomalies ?? 0;
              const isWarning = activeAnomalies > 0;
              const isOffline = ds.status === 'inactive';

              return (
                <Link key={ds.id} to={`/datasources/${ds.id}`} className="block group">
                  <div
                    className={`bg-white rounded-xl border shadow-sm p-5 group-hover:shadow-md transition-shadow ${
                      isWarning ? 'border-l-4 border-l-yellow-400' : 'border-gray-200'
                    } ${isOffline ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{ds.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {TYPE_LABEL_MAP[ds.type] || ds.type}
                        </div>
                      </div>
                      <StatusDot variant={statusDotVariant(ds.status)} size="sm" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Last check</span>
                        <span className="text-gray-600 font-medium">
                          {toRelativeTime(ds.last_profiled_at || ds.updated_at)}
                        </span>
                      </div>
                      {isOffline ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Agent status</span>
                          <Badge variant="default" size="sm">Offline</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Active anomalies</span>
                          <span
                            className={`font-semibold ${activeAnomalies > 0 ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {activeAnomalies}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="feed-heading">
        <Card className="overflow-hidden" padding="none">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 id="feed-heading" className="text-sm font-semibold text-gray-900">
              Recent Activity
            </h3>
            <Link to="/anomalies" className="text-sm text-gray-500 hover:text-gray-700">
              View all
            </Link>
          </div>

          {anomaliesLoading || runsLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton variant="circular" width="36px" height="36px" />
                  <div className="flex-1">
                    <Skeleton variant="text" width="70%" />
                    <div className="mt-1">
                      <Skeleton variant="text" width="50%" />
                    </div>
                  </div>
                  <Skeleton variant="text" width="60px" />
                </div>
              ))}
            </div>
          ) : anomaliesError || runsError ? (
            <div className="p-6">
              <ErrorPanel
                message={
                  anomaliesErrorObj instanceof Error
                    ? anomaliesErrorObj.message
                    : runsErrorObj instanceof Error
                      ? runsErrorObj.message
                      : 'Failed to load activity feed'
                }
                onRetry={() => {
                  queryClient.invalidateQueries({ queryKey: ['dashboard', 'anomalies-recent'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard', 'runs-recent'] });
                }}
              />
            </div>
          ) : feedItems.length === 0 ? (
            dataSources.length > 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Tudo certo!</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Nenhuma anomalia detectada. Seus dados estao saudaveis.
                </p>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm text-gray-400 text-center">No recent activity</p>
              </div>
            )
          ) : (
            <div className="divide-y divide-gray-50">
              {feedItems.map((item) => {
                const iconBg =
                  item.icon === 'anomaly'
                    ? 'bg-red-50'
                    : item.icon === 'pipeline_success'
                      ? 'bg-green-50'
                      : 'bg-red-50';
                const iconColor =
                  item.icon === 'anomaly'
                    ? 'text-red-500'
                    : item.icon === 'pipeline_success'
                      ? 'text-green-500'
                      : 'text-red-500';
                const IconComponent =
                  item.icon === 'anomaly'
                    ? AlertTriangle
                    : item.icon === 'pipeline_success'
                      ? CheckCircle
                      : XCircle;

                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.linkTo}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${iconBg} ${iconColor}`}
                    >
                      <IconComponent size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {toRelativeTime(item.timestamp)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
