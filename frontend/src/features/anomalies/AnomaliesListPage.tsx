import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { api } from '../../lib/api';
import type { AnomalyListResponse } from '../../types/anomaly';

function severityVariant(severity: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return map[severity] ?? 'default';
}

function formatDate(iso: string) {
  return iso;
}

const PER_PAGE = 50;

export function AnomaliesListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [resolved, setResolved] = useState('');

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('per_page', String(PER_PAGE));
  if (severity) queryParams.set('severity', severity);
  if (type) queryParams.set('type', type);
  if (resolved !== '') queryParams.set('resolved', resolved);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['anomalies', { page, severity, type, resolved }],
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

  const anomalies = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Anomalies</h1>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Severity"
            name="severity"
            options={[
              { value: '', label: 'All' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          />
          <Select
            label="Type"
            name="type"
            options={[
              { value: '', label: 'All' },
              { value: 'volume', label: 'Volume' },
              { value: 'null_check', label: 'Null Check' },
              { value: 'schema_change', label: 'Schema Change' },
            ]}
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="resolved-filter" className="text-sm font-medium text-gray-700">Resolved</label>
            <select
              id="resolved-filter"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={resolved}
              onChange={(e) => { setResolved(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="false">Pending</option>
              <option value="true">Resolved</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-2">{(error as Error)?.message || 'Failed to load anomalies'}</p>
          <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['anomalies'] })}>
            Retry
          </Button>
        </Card>
      ) : anomalies.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No anomalies found</p>
        </Card>
      ) : (
        <>
          <Card>
            <Table headers={['Severity', 'Type', 'Description', 'Detected At', 'Status', 'Actions']}>
              {anomalies.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                  </td>
                  <td className="p-3 text-sm text-gray-600 capitalize">{a.type.replace('_', ' ')}</td>
                  <td className="p-3 text-sm max-w-xs">
                    <Link to={`/anomalies/${a.id}`} className="hover:text-blue-600">
                      {a.description}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-gray-500">{formatDate(a.detected_at)}</td>
                  <td className="p-3">
                    <Badge variant={a.resolved_at ? 'success' : 'warning'}>
                      {a.resolved_at ? 'Resolved' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/anomalies/${a.id}`}
                        className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-3 py-1.5 text-sm bg-transparent text-gray-700 hover:bg-gray-100"
                      >
                        Detail
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
                  </td>
                </tr>
              ))}
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
