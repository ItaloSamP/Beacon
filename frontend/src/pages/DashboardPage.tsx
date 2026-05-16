import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Table } from '../components/ui/Table';
import { api } from '../lib/api';
import type { PaginatedResponse } from '../types/api';
import type { DataSource } from '../types/datasource';
import type { Agent } from '../types/agent';
import type { Pipeline } from '../types/pipeline';
import type { Anomaly } from '../types/anomaly';
import type { PipelineRun } from '../types/pipeline_run';
import { Database, AlertTriangle, GitBranch, Server } from 'lucide-react';

function severityVariant(severity: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return map[severity] ?? 'default';
}

function statusVariant(status: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    success: 'success',
    warning: 'warning',
    error: 'danger',
    running: 'info',
  };
  return map[status] ?? 'default';
}

function formatDate(iso: string) {
  return iso;
}

export function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: dsData, isError: dsError } = useQuery({
    queryKey: ['dashboard', 'datasources-count'],
    queryFn: () => api.get<PaginatedResponse<DataSource>>('/datasources?per_page=1'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['dashboard', 'agents-count'],
    queryFn: () => api.get<PaginatedResponse<Agent>>('/agents?status=online&per_page=1'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: anomaliesCountData } = useQuery({
    queryKey: ['dashboard', 'anomalies-count'],
    queryFn: () => api.get<{ data: Anomaly[]; meta: { total: number }; error: null }>('/anomalies?resolved=false&per_page=1'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: pipelinesData } = useQuery({
    queryKey: ['dashboard', 'pipelines-count'],
    queryFn: () => api.get<PaginatedResponse<Pipeline>>('/pipelines?per_page=1'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const {
    data: anomaliesData,
    isLoading: anomaliesLoading,
    isError: anomaliesError,
  } = useQuery({
    queryKey: ['dashboard', 'anomalies-feed'],
    queryFn: () => api.get<{ data: Anomaly[]; meta: { total: number }; error: null }>('/anomalies/recent?limit=10'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const {
    data: runsData,
    isLoading: runsLoading,
    isError: runsError,
  } = useQuery({
    queryKey: ['dashboard', 'runs-feed'],
    queryFn: () => api.get<{ data: PipelineRun[]; meta: { total: number }; error: null }>('/pipeline-runs/recent?limit=10'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const dsCount = dsData?.meta?.total ?? 0;
  const agentsOnline = agentsData?.meta?.total ?? 0;
  const unresolvedAnomalies = anomaliesCountData?.meta?.total ?? 0;
  const pipelinesCount = pipelinesData?.meta?.total ?? 0;
  const anomalies = anomaliesData?.data ?? [];
  const runs = runsData?.data ?? [];

  return (
    <div data-testid="dashboard" className="dashboard-page">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">DataSources</p>
              <p className="text-2xl font-bold">{dsError ? '—' : dsCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Server size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Agents Online</p>
              <p className="text-2xl font-bold">{agentsOnline}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unresolved Anomalies</p>
              <p className="text-2xl font-bold">{unresolvedAnomalies}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <GitBranch size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pipelines</p>
              <p className="text-2xl font-bold">{pipelinesCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Anomalies</h2>
            <Link to="/anomalies" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          {anomaliesLoading ? (
            <Card className="p-8 flex items-center justify-center">
              <Spinner size="lg" />
            </Card>
          ) : anomaliesError ? (
            <Card className="p-8 text-center">
              <p className="text-red-600 mb-2">Failed to load anomalies</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'anomalies-feed'] })}
              >
                Retry
              </Button>
            </Card>
          ) : anomalies.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No anomalies detected</p>
            </Card>
          ) : (
            <Card>
              <Table headers={['Severity', 'Type', 'Description', 'Date']}>
                {anomalies.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <Link to={`/anomalies/${a.id}`}>
                        <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                      </Link>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{a.type}</td>
                    <td className="p-3 text-sm max-w-xs truncate">
                      <Link to={`/anomalies/${a.id}`} className="hover:text-blue-600">
                        {a.description}
                      </Link>
                    </td>
                    <td className="p-3 text-sm text-gray-500">{formatDate(a.detected_at)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Pipeline Runs</h2>
            <Link to="/pipelines" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          {runsLoading ? (
            <Card className="p-8 flex items-center justify-center">
              <Spinner size="lg" />
            </Card>
          ) : runsError ? (
            <Card className="p-8 text-center">
              <p className="text-red-600 mb-2">Failed to load pipeline runs</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'runs-feed'] })}
              >
                Retry
              </Button>
            </Card>
          ) : runs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No pipeline runs found</p>
            </Card>
          ) : (
            <Card>
              <Table headers={['Pipeline', 'Status', 'Duration', 'Date']}>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium">
                      <Link to={`/pipelines/${r.pipeline_id}/runs`} className="hover:text-blue-600">
                        {r.pipeline?.name ?? r.pipeline_id}
                      </Link>
                    </td>
                    <td className="p-3">
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-sm text-gray-500">
                      {r.finished_at
                        ? `${Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)}s`
                        : '—'}
                    </td>
                    <td className="p-3 text-sm text-gray-500">{formatDate(r.started_at)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
