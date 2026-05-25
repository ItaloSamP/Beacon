import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatusDot } from '../../components/ui/StatusDot';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { Skeleton } from '../../components/ui/Skeleton';
import { FilterBar } from '../../components/ui/FilterBar';
import { api } from '../../lib/api';
import type { DataSource } from '../../types/datasource';
import type { PaginatedResponse } from '../../types/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const STATUS_DOT_MAP: Record<string, 'online' | 'offline' | 'error' | 'warning'> = {
  active: 'online',
  error: 'error',
  inactive: 'offline',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: 'Online',
  error: 'Connection Error',
  inactive: 'Offline',
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

export function DataSourcesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<DataSource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    Status: 'all',
    Type: 'all',
    Sort: 'date-newest',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['datasources'],
    queryFn: () => api.get<PaginatedResponse<DataSource>>('/datasources'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/datasources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasources'] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      console.error('[DataSourcesListPage] Delete failed:', err.message);
      alert(`Failed to delete data source: ${err.message}`);
    },
  });

  const handleFilterChange = useCallback(
    (filters: Record<string, string>) => {
      setActiveFilters(filters);
    },
    [],
  );

  const dataSources = data?.data ?? [];

  const filteredDataSources = useMemo(() => {
    let result = dataSources;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((ds) => ds.name.toLowerCase().includes(q));
    }

    const statusFilter = activeFilters['Status'];
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((ds) => ds.status === statusFilter);
    }

    const typeFilter = activeFilters['Type'];
    if (typeFilter && typeFilter !== 'all') {
      result = result.filter((ds) => ds.type === typeFilter);
    }

    const sortValue = activeFilters['Sort'];
    const sorted = [...result];
    switch (sortValue) {
      case 'date-newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'date-oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'name-az':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-za':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
    return sorted;
  }, [dataSources, searchQuery, activeFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Data Sources</h1>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search data sources..."
            aria-label="Search data sources"
            className="w-64"
          />
          <Button onClick={() => navigate('/datasources/new')}>
            <Plus size={16} className="mr-2" />+ Add Data Source
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <FilterBar onFilterChange={handleFilterChange}>
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all" active>
              All Status
            </FilterBar.Pill>
            <FilterBar.Pill value="active">Online</FilterBar.Pill>
            <FilterBar.Pill value="error">Connection Error</FilterBar.Pill>
          </FilterBar.Group>
          <FilterBar.Group label="Type">
            <FilterBar.Pill value="all" active>
              All Types
            </FilterBar.Pill>
            <FilterBar.Pill value="postgres">PostgreSQL</FilterBar.Pill>
            <FilterBar.Pill value="mysql">MySQL</FilterBar.Pill>
          </FilterBar.Group>
          <FilterBar.Group label="Sort">
            <FilterBar.Pill value="date-newest" active>
              Date: Newest
            </FilterBar.Pill>
            <FilterBar.Pill value="date-oldest">Date: Oldest</FilterBar.Pill>
            <FilterBar.Pill value="name-az">Name: A–Z</FilterBar.Pill>
            <FilterBar.Pill value="name-za">Name: Z–A</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      </div>

      {isLoading ? (
        <Card className="p-6">
          <Skeleton count={6} variant="rectangular" height="44px" />
        </Card>
      ) : isError ? (
        <ErrorPanel
          message={error instanceof Error ? error.message : 'Failed to load data sources.'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['datasources'] })}
        />
      ) : (
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {filteredDataSources.length} data source{filteredDataSources.length !== 1 ? 's' : ''}
            </span>
          </div>
          {filteredDataSources.length === 0 ? (
            <EmptyState
              title={dataSources.length === 0 ? 'No data sources' : 'No matching data sources'}
              description={
                dataSources.length === 0
                  ? 'Create your first data source to get started.'
                  : 'Try adjusting your search or filters.'
              }
              action={
                dataSources.length === 0
                  ? { label: 'Add Data Source', onClick: () => navigate('/datasources/new') }
                  : undefined
              }
              compact
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-3 pl-6">Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Agent</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Profiled</th>
                  <th className="p-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDataSources.map((ds) => (
                  <tr key={ds.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 pl-6">
                      <Link
                        to={`/datasources/${ds.id}`}
                        className="text-blue-600 font-medium hover:underline"
                      >
                        {ds.name}
                      </Link>
                    </td>
                    <td className="p-3">
                      <Badge variant="info" size="sm">
                        {TYPE_LABEL_MAP[ds.type] || ds.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {ds.agent?.name || '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <StatusDot variant={STATUS_DOT_MAP[ds.status] || 'offline'} size="sm" />
                        <span className="text-sm text-gray-600">
                          {STATUS_LABEL_MAP[ds.status] || ds.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-500">
                      {toRelativeTime(ds.last_profiled_at || ds.updated_at)}
                    </td>
                    <td className="p-3 pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/datasources/${ds.id}/edit`)}
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(ds)}
                          aria-label="Delete"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={14} className="text-red-500" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Data Source"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
