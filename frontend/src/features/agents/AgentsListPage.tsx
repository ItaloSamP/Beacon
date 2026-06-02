import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusDot } from '../../components/ui/StatusDot';
import { SearchInput } from '../../components/ui/SearchInput';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { api } from '../../lib/api';
import { useSetPageHeader } from '../../components/layout/PageHeaderContext';
import type { Agent } from '../../types/agent';
import type { PaginatedResponse } from '../../types/api';
import {
  Plus,
  Pencil,
  Trash2,
  Key,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

function relativeTime(isoString: string | null): string {
  if (!isoString) return '\u2014';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 0) return 'just now';
  if (diffSec < 60) return `${diffSec} sec ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

function isOfflineOver48h(agent: Agent): boolean {
  if (agent.status !== 'offline' || !agent.last_heartbeat_at) return false;
  const then = new Date(agent.last_heartbeat_at).getTime();
  return Date.now() - then > 48 * 60 * 60 * 1000;
}

function maskToken(token: string): string {
  if (token.length <= 16) return token;
  return token.slice(0, 16) + '\u2026';
}

export function AgentsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    onError: (err: Error) => {
      console.error('[AgentsListPage] Delete failed:', err.message);
      alert(`Failed to delete agent: ${err.message}`);
    },
  });

  const handleCopy = useCallback(async (agent: Agent) => {
    const token = agent.agent_token;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopiedId(agent.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error('[AgentsListPage] Clipboard write failed');
    }
  }, []);

  const headerActions = (
    <div className="flex items-center gap-3">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search agents..."
        className="w-64"
      />
      <Button onClick={() => navigate('/agents/new')}>
        <Plus size={16} className="mr-1" />New Agent
      </Button>
    </div>
  );
  useSetPageHeader('Agents', headerActions);

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="none">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton variant="text" width="160px" height="18px" />
                    <Skeleton variant="text" width="100px" height="14px" />
                  </div>
                  <Skeleton variant="circular" width="12px" height="12px" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton variant="text" width="80px" height="14px" />
                  <Skeleton variant="text" width="80px" height="14px" />
                  <Skeleton variant="text" width="100px" height="14px" />
                  <Skeleton variant="text" width="80px" height="14px" />
                </div>
                <Skeleton variant="rectangular" width="100%" height="32px" />
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <Skeleton variant="rectangular" width="60px" height="28px" />
                  <Skeleton variant="rectangular" width="60px" height="28px" />
                  <Skeleton variant="rectangular" width="60px" height="28px" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center mt-4">
          <Spinner />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <ErrorPanel
          message={error instanceof Error ? error.message : 'Failed to load agents.'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['agents'] })}
        />
      </div>
    );
  }

  const agents = data?.data ?? [];
  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.host ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onlineCount = agents.filter((a) => a.status === 'online').length;
  const offlineCount = agents.filter((a) => a.status === 'offline').length;

  return (
    <div>

      <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <StatusDot variant="online" size="sm" />
          <span>
            <strong>{onlineCount}</strong> Online
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot variant="offline" size="sm" />
          <span>
            <strong>{offlineCount}</strong> Offline
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">|</span>
          <span>
            <strong>{agents.length}</strong> Total
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No agents found' : 'No agents found'}
          description={
            searchQuery
              ? 'No agents match your search. Try a different query.'
              : 'Create your first agent to get started.'
          }
          action={
            searchQuery
              ? { label: 'Clear search', onClick: () => setSearchQuery('') }
              : { label: 'Register New Agent', onClick: () => navigate('/agents/new') }
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          {filtered.map((agent) => {
            const off48 = isOfflineOver48h(agent);
            const tokenDisplay = agent.agent_token
              ? maskToken(agent.agent_token)
              : '';
            const isCopied = copiedId === agent.id;

            return (
              <Card
                key={agent.id}
                padding="none"
                hoverable
                className={agent.status === 'offline' ? 'opacity-75' : ''}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {agent.name}
                      </h3>
                      {agent.host && (
                        <p className="text-sm font-mono text-gray-500 truncate mt-0.5">
                          {agent.host}
                        </p>
                      )}
                    </div>
                    <StatusDot
                      variant={agent.status === 'online' ? 'online' : 'offline'}
                      size="md"
                      className={
                        agent.status === 'online'
                          ? '[&_span[class*="rounded-full"]]:shadow-[0_0_8px_rgba(34,197,94,0.5)] flex-shrink-0 ml-2'
                          : 'flex-shrink-0 ml-2'
                      }
                    />
                  </div>

                  {off48 && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800 flex items-start gap-2">
                      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-yellow-500" />
                      <div>
                        <p className="font-medium">
                          Agent offline for more than 48h
                        </p>
                        <p className="text-yellow-700 mt-0.5">
                          Check the agent host connectivity, firewall rules, and
                          ensure the beacon service is running.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs block">Version</span>
                      <span className="font-mono text-gray-700">
                        {agent.version || '\u2014'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Last Heartbeat</span>
                      <span className="text-gray-700">
                        {relativeTime(agent.last_heartbeat_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Data Sources</span>
                      <span className="text-gray-700">
                        {agent.data_sources_count != null
                          ? `${agent.data_sources_count} connected`
                          : '\u2014'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Pipelines</span>
                      <span className="text-gray-700">
                        {agent.pipelines_count != null
                          ? `${agent.pipelines_count} active`
                          : '\u2014'}
                      </span>
                    </div>
                  </div>

                  {agent.agent_token && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-md">
                      <code className="flex-1 text-xs font-mono text-gray-600 truncate select-all">
                        {tokenDisplay}
                      </code>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(agent);
                        }}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Copy token"
                      >
                        {isCopied ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {off48 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => navigate(`/agents/${agent.id}/edit`)}
                      >
                        <RefreshCw size={14} className="mr-1" />
                        Reconnect
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => navigate(`/agents/${agent.id}/edit`)}
                        aria-label="Edit"
                      >
                        <Pencil size={14} className="mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate(`/agents/${agent.id}/tokens`)}
                      aria-label="Manage Tokens"
                    >
                      <Key size={14} className="mr-1" />
                      Manage Tokens
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(agent);
                      }}
                      aria-label="Remove"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={14} className="mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Agent"
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
