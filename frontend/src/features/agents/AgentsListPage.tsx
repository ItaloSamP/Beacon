import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { api } from '../../lib/api';
import type { Agent } from '../../types/agent';
import type { PaginatedResponse } from '../../types/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function AgentsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<PaginatedResponse<Agent>>('/agents'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
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
        <p className="text-red-600">Failed to load agents.</p>
        <Button variant="secondary" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['agents'] })}>
          Retry
        </Button>
      </Card>
    );
  }

  const agents = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Button onClick={() => navigate('/agents/new')}>
          <Plus size={16} className="mr-2" /> New Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No agents found. Create your first agent!</p>
          <Button className="mt-4" onClick={() => navigate('/agents/new')}>
            <Plus size={16} className="mr-2" /> New Agent
          </Button>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Version</th>
                <th className="p-3">Created At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium">{agent.name}</td>
                  <td className="p-3">
                    <Badge variant={agent.status === 'online' ? 'success' : 'warning'}>
                      {agent.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-500">{agent.version || '—'}</td>
                  <td className="p-3 text-gray-500">
                    {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/agents/${agent.id}/edit`)} aria-label="Edit">
                        <Pencil size={14} />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(agent)} aria-label="Delete">
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
        title="Delete Agent"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
      />
    </div>
  );
}
