import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Toggle } from '../../components/ui/Toggle';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { Skeleton } from '../../components/ui/Skeleton';
import { api } from '../../lib/api';
import type { Pipeline, PipelineStatus } from '../../types/pipeline';
import type { PaginatedResponse } from '../../types/api';
import { Plus, Play, Pencil } from 'lucide-react';

const TYPE_LABEL_MAP: Record<string, string> = {
  volume: 'Volume',
  null_check: 'Null Check',
  schema_change: 'Schema Change',
  distribution: 'Distribution',
};

const STATUS_VARIANT_MAP: Record<PipelineStatus, 'success' | 'warning' | 'default'> = {
  healthy: 'success',
  warning: 'warning',
  paused: 'default',
};

const STATUS_LABEL_MAP: Record<PipelineStatus, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  paused: 'Paused',
};

export function PipelinesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get<PaginatedResponse<Pipeline>>('/pipelines'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.post<{ data: Pipeline; error: null }>(`/pipelines/${id}/toggle`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['pipelines'] });
      const previous = queryClient.getQueryData<PaginatedResponse<Pipeline>>(['pipelines']);
      if (previous) {
        queryClient.setQueryData<PaginatedResponse<Pipeline>>(['pipelines'], {
          ...previous,
          data: previous.data.map((p) =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['pipelines'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => {
      setRunningIds((prev) => new Set(prev).add(id));
      return api.post(`/pipelines/${id}/run`);
    },
    onSettled: (_data, _err, id) => {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['pipeline-runs'] });
    },
  });

  const pipelines = data?.data ?? [];

  const uniqueDataSourceIds = new Set(pipelines.map((p) => p.data_source_id));
  const dataSourceCount = uniqueDataSourceIds.size;

  const filteredPipelines = useMemo(() => {
    if (!searchQuery) return pipelines;
    const q = searchQuery.toLowerCase();
    return pipelines.filter((p) => p.name.toLowerCase().includes(q));
  }, [pipelines, searchQuery]);

  if (isError) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Pipelines</h1>
        <ErrorPanel
          message={error instanceof Error ? error.message : 'Failed to load pipelines.'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['pipelines'] })}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Pipelines</h1>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search pipelines..."
            aria-label="Search pipelines"
            className="w-64"
          />
          <Button onClick={() => navigate('/pipelines/new')}>
            <Plus size={16} className="mr-2" />+ New Pipeline
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-6">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height="48px" />
            ))}
          </div>
        </Card>
      ) : pipelines.length === 0 ? (
        <EmptyState
          title="No pipelines"
          description="Create your first pipeline to start monitoring data quality."
          action={{ label: 'New Pipeline', onClick: () => navigate('/pipelines/new') }}
        />
      ) : (
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <span className="text-sm text-gray-500">
              {filteredPipelines.length} pipeline{filteredPipelines.length !== 1 ? 's' : ''} across {dataSourceCount} data source{dataSourceCount !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredPipelines.length === 0 ? (
            <EmptyState
              title="No matching pipelines"
              description="Try adjusting your search."
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-3 pl-6">Pipeline</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Data Source</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Enabled</th>
                    <th className="p-3 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPipelines.map((pipeline) => (
                    <tr key={pipeline.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 pl-6">
                        <Link
                          to={`/pipelines/${pipeline.id}/runs`}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          {pipeline.name}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge variant="info" size="sm">
                          {TYPE_LABEL_MAP[pipeline.type] || pipeline.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {pipeline.data_source?.name || '—'}
                      </td>
                      <td className="p-3">
                        {pipeline.schedule ? (
                          <span className="inline-block bg-gray-100 rounded px-2 py-0.5 text-xs font-mono text-gray-600">
                            {pipeline.schedule}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={STATUS_VARIANT_MAP[pipeline.status || 'healthy']}
                          size="sm"
                        >
                          {STATUS_LABEL_MAP[pipeline.status || 'healthy']}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Toggle
                          checked={pipeline.enabled}
                          aria-label={`Toggle ${pipeline.name}`}
                          onChange={() => toggleMutation.mutate(pipeline.id)}
                        />
                      </td>
                      <td className="p-3 pr-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/pipelines/${pipeline.id}/edit`)}
                            aria-label="Edit"
                          >
                            <Pencil size={14} />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => runMutation.mutate(pipeline.id)}
                            loading={runningIds.has(pipeline.id)}
                            aria-label="Run Now"
                          >
                            <Play size={14} />
                            <span className="sr-only">Run Now</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
