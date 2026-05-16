import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { api } from '../../lib/api';
import type { PipelineRun, PipelineRunTriggerResponse } from '../../types/pipeline_run';
import { ArrowLeft, Play } from 'lucide-react';

function statusVariant(status: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    success: 'success',
    warning: 'warning',
    error: 'danger',
    running: 'info',
    started: 'info',
  };
  return map[status] ?? 'default';
}

function formatDuration(started: string, finished: string | null): string {
  if (!finished) return '—';
  const ms = new Date(finished).getTime() - new Date(started).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function PipelineRunsPage() {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pipeline-runs', pipelineId],
    queryFn: () =>
      api.get<{ data: PipelineRun[]; meta: { page: number; per_page: number; total: number }; error: null }>(
        `/pipelines/${pipelineId}/runs`
      ),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const runMutation = useMutation({
    mutationFn: () => api.post<{ data: PipelineRunTriggerResponse; error: null }>(`/pipelines/${pipelineId}/run`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-runs', pipelineId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const runs = data?.data ?? [];
  const pipelineName = runs.length > 0 ? runs[0].pipeline?.name : `Pipeline ${pipelineId}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-2">{(error as Error)?.message || 'Failed to load pipeline runs'}</p>
        <Button
          variant="secondary"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['pipeline-runs', pipelineId] })}
        >
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <Link
        to="/pipelines"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 mb-4"
      >
        <ArrowLeft size={14} /> Back to Pipelines
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{pipelineName} — Runs</h1>
        <Button
          onClick={() => runMutation.mutate()}
          loading={runMutation.isPending}
        >
          <Play size={14} className="mr-1" /> Run Now
        </Button>
      </div>

      {runs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-4">No runs yet</p>
          <Button onClick={() => runMutation.mutate()} loading={runMutation.isPending}>
            <Play size={14} className="mr-1" /> Run Now
          </Button>
        </Card>
      ) : (
        <Card>
          <Table headers={['Status', 'Started At', 'Finished At', 'Duration', 'Metrics']}>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3">
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </td>
                <td className="p-3 text-sm text-gray-600">{r.started_at}</td>
                <td className="p-3 text-sm text-gray-600">{r.finished_at ?? '—'}</td>
                <td className="p-3 text-sm text-gray-500">
                  {formatDuration(r.started_at, r.finished_at)}
                </td>
                <td className="p-3 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(r.metrics_json).slice(0, 3).map(([key, value]) => (
                      <span key={key} className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-xs">
                        {key}: {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </span>
                    ))}
                    {Object.keys(r.metrics_json).length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{Object.keys(r.metrics_json).length - 3} more
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
