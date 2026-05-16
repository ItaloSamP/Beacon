import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { api } from '../../lib/api';
import type { DataSource } from '../../types/datasource';
import type { PaginatedResponse } from '../../types/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function DataSourcesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<DataSource | null>(null);

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
  });

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
        <p className="text-red-600">Failed to load data sources.</p>
        <Button variant="secondary" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['datasources'] })}>
          Retry
        </Button>
      </Card>
    );
  }

  const dataSources = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Data Sources</h1>
        <Button onClick={() => navigate('/datasources/new')}>
          <Plus size={16} className="mr-2" /> Add DataSource
        </Button>
      </div>

      {dataSources.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No data sources found. Create your first one!</p>
          <Button className="mt-4" onClick={() => navigate('/datasources/new')}>
            <Plus size={16} className="mr-2" /> Add DataSource
          </Button>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Health</th>
                <th className="p-3">Status</th>
                <th className="p-3">Agent</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataSources.map(ds => (
                <tr key={ds.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium">{ds.name}</td>
                  <td className="p-3">{ds.type}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        ds.status === 'active' ? 'bg-green-500' : ds.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                      title={ds.status}
                    />
                  </td>
                  <td className="p-3">
                    <Badge variant={ds.status === 'active' ? 'success' : ds.status === 'error' ? 'danger' : 'warning'}>
                      {ds.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-500">{ds.agent?.name || '—'}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/datasources/${ds.id}/edit`)} aria-label="Edit">
                        <Pencil size={14} />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(ds)} aria-label="Delete">
                        <Trash2 size={14} className="text-red-500" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Data Source"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
      />
    </div>
  );
}
