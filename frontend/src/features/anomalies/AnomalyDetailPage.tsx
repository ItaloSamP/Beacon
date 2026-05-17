import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { api } from '../../lib/api';
import type { Anomaly } from '../../types/anomaly';
import type { Alert } from '../../types/alert';
import { ArrowLeft } from 'lucide-react';

function severityVariant(severity: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return map[severity] ?? 'default';
}

function alertStatusVariant(status: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    sent: 'success',
    failed: 'danger',
    pending: 'warning',
  };
  return map[status] ?? 'default';
}

interface AnomalyDetail extends Anomaly {
  pipeline_run?: {
    id: string;
    pipeline: { id: string; name: string };
    data_source: { id: string; name: string };
    status: string;
    started_at: string;
    finished_at: string | null;
  };
  alerts?: Alert[];
}

export function AnomalyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['anomaly', id],
    queryFn: () => api.get<{ data: AnomalyDetail; error: null }>(`/anomalies/${id}`),
    staleTime: 30000,
  });

  const resolveMutation = useMutation({
    mutationFn: () => api.post(`/anomalies/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomaly', id] });
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    const errMsg = (error as Error)?.message || '';
    const is404 = errMsg.toLowerCase().includes('not found');
    return (
      <Card className="p-8 text-center">
        <p className={is404 ? 'text-gray-600 text-lg' : 'text-red-600'}>
          {is404 ? 'Anomaly not found' : errMsg || 'Failed to load anomaly'}
        </p>
        <Link
          to="/anomalies"
          className="inline-flex items-center gap-1 mt-4 text-blue-600 hover:underline"
        >
          <ArrowLeft size={14} /> Back to Anomalies
        </Link>
      </Card>
    );
  }

  const anomaly = data?.data;
  if (!anomaly) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">Anomaly not found</p>
        <Link to="/anomalies" className="inline-flex items-center gap-1 mt-4 text-blue-600 hover:underline">
          <ArrowLeft size={14} /> Back to Anomalies
        </Link>
      </Card>
    );
  }

  const run = anomaly.pipeline_run;
  const alerts = anomaly.alerts ?? [];

  return (
    <div>
      <Link to="/anomalies" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 mb-4">
        <ArrowLeft size={14} /> Back to Anomalies
      </Link>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold">Anomaly Detail</h1>
        {!anomaly.resolved_at && (
          <Button
            loading={resolveMutation.isPending}
            onClick={() => resolveMutation.mutate()}
          >
            Resolve
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Severity</dt>
              <dd><Badge variant={severityVariant(anomaly.severity)}>{anomaly.severity}</Badge></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Type</dt>
              <dd className="text-sm font-medium capitalize">{anomaly.type.replace('_', ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <Badge variant={anomaly.resolved_at ? 'success' : 'warning'}>
                  {anomaly.resolved_at ? 'Resolved' : 'Pending'}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Detected At</dt>
              <dd className="text-sm">{anomaly.detected_at}</dd>
            </div>
            {anomaly.resolved_at && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Resolved At</dt>
                <dd className="text-sm">{anomaly.resolved_at}</dd>
              </div>
            )}
          </dl>
        </Card>

        {run && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pipeline Info</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Pipeline</dt>
                <dd className="text-sm font-medium">
                  <Link to={`/pipelines/${run.pipeline.id}/runs`} className="text-blue-600 hover:underline">
                    {run.pipeline.name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Data Source</dt>
                <dd className="text-sm font-medium">{run.data_source.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Pipeline Run</dt>
                <dd className="text-sm font-mono">
                  <Link to={`/pipelines/${run.pipeline.id}/runs`} className="text-blue-600 hover:underline">
                    {run.id}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Run Status</dt>
                <dd><Badge variant={run.status === 'success' ? 'success' : run.status === 'error' ? 'danger' : 'warning'}>{run.status}</Badge></dd>
              </div>
            </dl>
          </Card>
        )}
      </div>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Description</h2>
        <p className="text-gray-700">{anomaly.description}</p>
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Deviation Details</h2>
        <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-auto max-h-80">
          {JSON.stringify(anomaly.deviation_details, null, 2)}
        </pre>
      </Card>

      {alerts.length > 0 && (
        <Card className="p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Alerts</h2>
          <Table headers={['Channel', 'Status', 'Sent At']}>
            {alerts.map((alert) => (
              <tr key={alert.id} className="border-b border-gray-100">
                <td className="p-3 text-sm font-medium capitalize">{alert.channel}</td>
                <td className="p-3">
                  <Badge variant={alertStatusVariant(alert.status)}>{alert.status}</Badge>
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {alert.sent_at ? alert.sent_at : '—'}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
