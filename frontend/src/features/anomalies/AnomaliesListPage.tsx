import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { Recommendation } from '../../components/ui/Recommendation';
import { useSetPageHeader } from '../../components/layout/PageHeaderContext';
import { api } from '../../lib/api';
import type { AnomalyListResponse, AnomalyListItem } from '../../types/anomaly';
import { AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

function severityVariant(severity: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'critical'> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'critical',
  };
  return map[severity] ?? 'default';
}

function formatRelativeTime(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return iso.split('T')[0];
}

function formatDate(iso: string) {
  return iso.split('T')[0];
}

const PER_PAGE = 50;

export function AnomaliesListPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');

  const resolvedParam = tab === 'active' ? 'false' : tab === 'resolved' ? 'true' : '';

  const queryParams = new URLSearchParams();
  queryParams.set('page', '1');
  queryParams.set('per_page', String(PER_PAGE));
  if (resolvedParam !== '') queryParams.set('resolved', resolvedParam);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['anomalies', { resolved: resolvedParam }],
    queryFn: () => api.get<AnomalyListResponse>(`/anomalies?${queryParams.toString()}`),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/anomalies/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const anomalies: AnomalyListItem[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const activeCount = data?.meta?.active_count ?? 0;

  const criticalAnomaly = useMemo(
    () => anomalies.find((a) => a.severity === 'critical' && !a.resolved_at),
    [anomalies],
  );

  useSetPageHeader('Anomalies');

  if (isLoading) {
    return (
      <div>
        <div className="flex border-b border-border mb-6">
          <div className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary -mb-px">
            All Anomalies
          </div>
          <div className="px-4 py-2 text-sm font-medium text-muted-foreground">Active</div>
          <div className="px-4 py-2 text-sm font-medium text-muted-foreground">Resolved</div>
        </div>
        <Card>
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height="48px" width="100%" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <ErrorPanel
          message={(error as Error)?.message || 'Failed to load anomalies'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['anomalies'] })}
        />
      </div>
    );
  }

  return (
    <div>
      <Tabs defaultActive={tab} onChange={(id) => setTab(id)}>
        <Tabs.List>
          <Tabs.Tab id="all">All Anomalies</Tabs.Tab>
          <Tabs.Tab id="active" badge={activeCount}>Active</Tabs.Tab>
          <Tabs.Tab id="resolved">Resolved</Tabs.Tab>
        </Tabs.List>

        <div className="mt-6 space-y-6">
          <Tabs.Panel id="all">
            {renderContent()}
          </Tabs.Panel>
          <Tabs.Panel id="active">
            {renderContent()}
          </Tabs.Panel>
          <Tabs.Panel id="resolved">
            {renderContent()}
          </Tabs.Panel>
        </div>
      </Tabs>
    </div>
  );

  function renderContent() {
    if (anomalies.length === 0) {
      return (
        <Card>
          <EmptyState
            title="No anomalies found"
            description={tab === 'resolved' ? 'No resolved anomalies yet.' : 'No active anomalies. Everything looks good.'}
          />
        </Card>
      );
    }

    return (
      <>
        {criticalAnomaly && (
          <CriticalAnomalyDetail
            anomaly={criticalAnomaly}
            onResolve={(id) => resolveMutation.mutate(id)}
            isResolving={resolveMutation.isPending && resolveMutation.variables === criticalAnomaly.id}
          />
        )}

        <Card>
          <div className="px-6 py-4 border-b border-border-light">
            <span className="text-sm text-muted-foreground">Showing {total} anomalies</span>
          </div>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Cell header>Severity</Table.Cell>
                <Table.Cell header>Description</Table.Cell>
                <Table.Cell header>Data Source</Table.Cell>
                <Table.Cell header>Pipeline</Table.Cell>
                <Table.Cell header>Detected</Table.Cell>
                <Table.Cell header>Status</Table.Cell>
                <Table.Cell header>Actions</Table.Cell>
              </Table.Row>
            </Table.Head>
            {anomalies.map((a) => (
              <Table.Row
                key={a.id}
                className={`border-b border-gray-100 ${
                  a.severity === 'critical' && !a.resolved_at
                    ? 'bg-violet-50 hover:bg-violet-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Table.Cell>
                  <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                </Table.Cell>
                <Table.Cell className="text-sm max-w-xs">
                  <Link
                    to={`/anomalies/${a.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {a.description}
                  </Link>
                </Table.Cell>
                <Table.Cell className="text-sm text-gray-600">{a.data_source?.name ?? '—'}</Table.Cell>
                <Table.Cell className="text-sm text-gray-600">{a.pipeline?.name ?? '—'}</Table.Cell>
                <Table.Cell className="text-sm text-gray-500">{formatRelativeTime(a.detected_at)}</Table.Cell>
                <Table.Cell>
                  {a.resolved_at ? (
                    <Badge variant="success">
                      <CheckCircle size={12} className="mr-1" />
                      Resolved
                    </Badge>
                  ) : (
                    <Badge variant={severityVariant(a.severity)}>
                      <AlertTriangle size={12} className="mr-1" />
                      Active
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Link
                      to={`/anomalies/${a.id}`}
                      className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-3 py-1.5 text-xs bg-transparent text-gray-600 hover:bg-gray-100"
                    >
                      View
                    </Link>
                    {!a.resolved_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={resolveMutation.isPending && resolveMutation.variables === a.id}
                        onClick={() => resolveMutation.mutate(a.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table>
        </Card>
      </>
    );
  }
}

function CriticalAnomalyDetail({
  anomaly,
  onResolve,
  isResolving,
}: {
  anomaly: AnomalyListItem;
  onResolve: (id: string) => void;
  isResolving: boolean;
}) {
  const dd = anomaly.deviation_details;
  const baselineMean = dd.baseline_mean as number;
  const currentValue = dd.current_value as number;
  const zScore = dd.z_score as number;
  const affectedRows = dd.affected_rows as number;
  const metric = (dd.metric as string) || (dd.column as string) || '—';
  const unit = anomaly.type === 'null_check' || anomaly.type === 'schema_change' ? '%' : '';

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="critical">Critical</Badge>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{anomaly.description}</h2>
          <div className="flex gap-6 mt-2 text-sm text-muted-foreground">
            <span>
              Data Source: <strong className="text-gray-700">{anomaly.data_source?.name ?? '—'}</strong>
            </span>
            <span>
              Pipeline: <strong className="text-gray-700">{anomaly.pipeline?.name ?? '—'}</strong>
            </span>
            <span>
              Detected: <strong className="text-gray-700">{formatRelativeTime(anomaly.detected_at)}</strong>
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          loading={isResolving}
          onClick={() => onResolve(anomaly.id)}
        >
          Resolve
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Deviation Evidence</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1.5 px-2 text-gray-500 font-medium w-44">Metric</td>
                <td className="py-1.5 px-2 text-gray-900 font-semibold">{anomaly.description}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 text-gray-500 font-medium">Baseline (mean)</td>
                <td className="py-1.5 px-2 text-gray-900 font-semibold">
                  {baselineMean != null ? `${baselineMean}${unit}` : '—'}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 text-gray-500 font-medium">Current value</td>
                <td className="py-1.5 px-2">
                  <span className="font-semibold text-red-600 font-mono">
                    {currentValue != null ? `${currentValue}${unit}` : '—'} &#8593;
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 text-gray-500 font-medium">Z-score</td>
                <td className="py-1.5 px-2">
                  <span className="font-semibold text-red-600 font-mono">
                    {zScore != null ? `${zScore > 0 ? '+' : ''}${zScore}` : '—'}
                  </span>
                  {zScore != null && zScore > 3 && (
                    <span className="text-xs text-red-500 ml-1">(p &lt; 0.001)</span>
                  )}
                </td>
              </tr>
              {affectedRows != null && (
                <tr>
                  <td className="py-1.5 px-2 text-gray-500 font-medium">Affected rows</td>
                  <td className="py-1.5 px-2 text-gray-900 font-semibold">
                    ~{affectedRows.toLocaleString()} rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {anomaly.recommendation && (
        <Recommendation
          title="Recommendation"
          description={anomaly.recommendation}
          severity="critical"
        />
      )}
    </Card>
  );
}
