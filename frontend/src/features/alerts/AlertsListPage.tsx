import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Hash } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { FilterBar } from '../../components/ui/FilterBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { api } from '../../lib/api';
import { useSetPageHeader } from '../../components/layout/PageHeaderContext';

interface AlertItem {
  id: string;
  anomaly: { id: string; description: string };
  channel: 'email' | 'slack';
  status: 'sent' | 'failed' | 'pending';
  sent_at: string | null;
  recipient: string;
}

interface AlertsResponse {
  data: AlertItem[];
  meta: { total: number };
  error: null;
}

function statusVariant(status: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    sent: 'success',
    failed: 'danger',
    pending: 'warning',
  };
  return map[status] ?? 'default';
}

function channelIcon(channel: string) {
  switch (channel) {
    case 'email':
      return <Mail size={14} className="mr-1" />;
    case 'slack':
      return <Hash size={14} className="mr-1" />;
    default:
      return null;
  }
}

function formatTimestamp(iso: string | null) {
  if (!iso) return '\u2014';
  return iso;
}

export function AlertsListPage() {
  const queryClient = useQueryClient();
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get<AlertsResponse>('/alerts'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const alerts = data?.data ?? [];

  const filtered = alerts.filter((a) => {
    if (channelFilter !== 'all' && a.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const handleFilterChange = (filters: Record<string, string>) => {
    if (filters['Channel'] !== undefined) {
      setChannelFilter(filters['Channel']);
    }
    if (filters['Status'] !== undefined) {
      setStatusFilter(filters['Status']);
    }
  };

  useSetPageHeader('Alerts');

  return (
    <div>
      <Card className="p-4 mb-6">
        <FilterBar onFilterChange={handleFilterChange}>
          <FilterBar.Group label="Channel">
            <FilterBar.Pill value="all" active>All</FilterBar.Pill>
            <FilterBar.Pill value="email">Email</FilterBar.Pill>
            <FilterBar.Pill value="slack">Slack</FilterBar.Pill>
          </FilterBar.Group>
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all" active>All</FilterBar.Pill>
            <FilterBar.Pill value="sent">Sent</FilterBar.Pill>
            <FilterBar.Pill value="failed">Failed</FilterBar.Pill>
            <FilterBar.Pill value="pending">Pending</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      </Card>

      {isLoading ? (
        <Card className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="flex-1 h-5" />
                <Skeleton className="w-20 h-5" />
                <Skeleton className="w-16 h-6" />
                <Skeleton className="w-32 h-5" />
                <Skeleton className="w-24 h-5" />
              </div>
            ))}
          </div>
        </Card>
      ) : isError ? (
        <ErrorPanel
          message={(error as Error)?.message || 'Failed to load alerts'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['alerts'] })}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="No alerts sent yet" />
        </Card>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Showing {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
          </p>
          <Card className="overflow-x-auto">
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Cell header>Anomaly</Table.Cell>
                  <Table.Cell header>Channel</Table.Cell>
                  <Table.Cell header>Status</Table.Cell>
                  <Table.Cell header>Sent At</Table.Cell>
                  <Table.Cell header>Recipient</Table.Cell>
                </Table.Row>
              </Table.Head>
              {filtered.map((a) => (
                <Table.Row key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <Table.Cell className="text-sm max-w-xs">
                    <Link to={`/anomalies/${a.anomaly.id}`} className="hover:text-blue-600">
                      {a.anomaly.description}
                    </Link>
                  </Table.Cell>
                  <Table.Cell className="text-sm text-gray-600">
                    <span className="inline-flex items-center capitalize">
                      {channelIcon(a.channel)}
                      {a.channel}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                  </Table.Cell>
                  <Table.Cell className="text-sm text-gray-500">{formatTimestamp(a.sent_at)}</Table.Cell>
                  <Table.Cell className="text-sm text-gray-600">{a.recipient}</Table.Cell>
                </Table.Row>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
