import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { StatusDot } from '../../components/ui/StatusDot';
import { ComparisonBox } from '../../components/ui/ComparisonBox';
import { ZScoreDisplay } from '../../components/ui/ZScoreDisplay';
import { Recommendation } from '../../components/ui/Recommendation';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { api } from '../../lib/api';
import type { AnomalyDetail } from '../../types/anomaly';
import { AlertTriangle, CheckCircle, ChevronRight, Mail, MessageCircle } from 'lucide-react';

function severityVariant(severity: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'critical'> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'critical',
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

function runStatusVariant(status: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    success: 'success',
    warning: 'warning',
    error: 'danger',
    started: 'info',
  };
  return map[status] ?? 'default';
}

function getRunStatusDot(status: string): 'online' | 'offline' | 'warning' | 'error' {
  const map: Record<string, 'online' | 'offline' | 'warning' | 'error'> = {
    success: 'online',
    warning: 'warning',
    error: 'error',
    started: 'offline',
  };
  return map[status] ?? 'offline';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getZScoreLabel(absValue: number): string {
  if (absValue < 2) return 'Normal';
  if (absValue < 3) return 'Moderate Deviation';
  return 'Extreme Deviation';
}

function formatZScoreValue(value: number): string {
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `z=${value > 0 ? '+' : ''}${formatted}`;
}

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'email':
      return <Mail size={14} />;
    case 'slack':
      return <MessageCircle size={14} />;
    default:
      return null;
  }
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
    if (is404) {
      return (
        <EmptyState
          title="Anomalia nao encontrada"
          description="O ID informado nao corresponde a nenhuma anomalia registrada. Verifique o link ou volte ao dashboard."
        />
      );
    }
    return (
      <ErrorPanel
        message={errMsg || 'Failed to load anomaly'}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['anomaly', id] })}
      />
    );
  }

  const anomaly = data?.data;
  if (!anomaly) {
    return (
      <EmptyState
        title="Anomalia nao encontrada"
        description="O ID informado nao corresponde a nenhuma anomalia registrada."
      />
    );
  }

  const run = anomaly.pipeline_run;
  const alerts = anomaly.alerts ?? [];
  const dd = anomaly.deviation_details;
  const isResolved = !!anomaly.resolved_at;
  const zScore = (dd.z_score as number) ?? 0;
  const zScoreAbs = Math.abs(zScore);

  const baselineMean = (dd.baseline_mean as number) ?? 0;
  const currentValue = (dd.current_value as number) ?? 0;
  const unit = anomaly.type === 'null_check' || anomaly.type === 'schema_change' ? '%' : '';
  const baselineDisplay = anomaly.type === 'null_check' || anomaly.type === 'schema_change'
    ? `${baselineMean}${unit}`
    : baselineMean;
  const currentDisplay = anomaly.type === 'null_check' || anomaly.type === 'schema_change'
    ? `${currentValue}${unit}`
    : currentValue;

  return (
    <div>
      <Breadcrumb className="mb-6">
        <Breadcrumb.Item href="/anomalies">Anomalies</Breadcrumb.Item>
        <Breadcrumb.Item isCurrentPage>
          {anomaly.type.replace('_', ' ')} {anomaly.description.length > 30 ? anomaly.description.substring(0, 30) + '...' : anomaly.description}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 flex-wrap">
              Anomalia em {anomaly.type.replace('_', ' ')} {anomaly.description.length > 40 ? anomaly.description.substring(0, 40) + '...' : anomaly.description}
              {isResolved ? (
                <Badge variant="success">
                  <CheckCircle size={12} className="mr-1" />
                  Resolvida em {anomaly.resolved_at ? formatDateShort(anomaly.resolved_at) : '—'}
                </Badge>
              ) : (
                <Badge variant={severityVariant(anomaly.severity)}>{anomaly.severity}</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Detectada {anomaly.detected_at ? formatRelative(anomaly.detected_at) : '—'}{' '}
              &middot;{' '}
              ID:{' '}
              <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                {anomaly.id}
              </code>
            </p>
          </div>
          {!isResolved && (
            <Button
              variant="primary"
              className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
              loading={resolveMutation.isPending}
              onClick={() => resolveMutation.mutate()}
            >
              <CheckCircle size={16} className="mr-1.5" />
              Marcar como Resolvida
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Visao Geral</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-500 font-medium w-36">Severidade</td>
                <td className="py-3 text-gray-900 font-medium">
                  <Badge variant={severityVariant(anomaly.severity)}>{anomaly.severity}</Badge>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-500 font-medium">Tipo</td>
                <td className="py-3 text-gray-900 font-medium capitalize">
                  {anomaly.type.replace('_', ' ')}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-500 font-medium">Status</td>
                <td className="py-3">
                  <span className="flex items-center gap-2">
                    <StatusDot variant={isResolved ? 'online' : 'error'} size="sm" />
                    <span className="text-gray-900 font-medium">
                      {isResolved ? 'Resolvida' : 'Pendente'}
                    </span>
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-500 font-medium">Detectada em</td>
                <td className="py-3 text-gray-900 font-medium">{formatDate(anomaly.detected_at)}</td>
              </tr>
              <tr>
                <td className="py-3 text-gray-500 font-medium">Resolvida em</td>
                <td className="py-3 text-gray-900 font-medium">
                  {anomaly.resolved_at ? formatDate(anomaly.resolved_at) : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        {run && (
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Pipeline &amp; Data Source</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 text-gray-500 font-medium w-36">Pipeline</td>
                  <td className="py-3">
                    <Link
                      to={`/pipelines/${run.pipeline.id}/runs`}
                      className="text-primary font-semibold hover:underline"
                    >
                      {run.pipeline.name}
                    </Link>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 text-gray-500 font-medium">Data Source</td>
                  <td className="py-3">
                    <Link
                      to={`/datasources/${run.data_source.id}`}
                      className="text-primary font-semibold hover:underline"
                    >
                      {run.data_source.name}
                    </Link>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 text-gray-500 font-medium">Pipeline Run ID</td>
                  <td className="py-3">
                    <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-900">
                      {run.id}
                    </code>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-500 font-medium">Status da Execucao</td>
                  <td className="py-3">
                    <Badge variant={runStatusVariant(run.status)}>{run.status}</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        )}

        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Comparacao: Baseline vs. Valor Atual</h3>
            <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Baseline (Historico)</div>
                <div className="text-3xl font-extrabold text-green-700 leading-none">
                  {baselineDisplay}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {anomaly.type === 'null_check' ? 'null ratio medio' : 'metric baseline'}
                </div>
              </div>
              <ChevronRight size={28} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Valor Atual (Execucao)</div>
                <div className="text-3xl font-extrabold text-red-600 leading-none">
                  {currentDisplay}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {anomaly.type === 'null_check' ? 'null ratio detectado' : 'current value'}
                </div>
              </div>
              <div className="w-px h-20 bg-gray-300 flex-shrink-0" />
              <div className="flex-shrink-0 text-center">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Diferenca</div>
                {baselineMean !== 0 && currentValue !== 0 ? (
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                    Math.abs(currentValue - baselineMean) / Math.abs(baselineMean) > 0.1
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {baselineMean === 0 ? 'N/A' : `${currentValue > baselineMean ? '+' : '-'}${Math.round(Math.abs((currentValue - baselineMean) / baselineMean) * 100)}%`}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-4 p-5 bg-red-50 rounded-xl border border-red-200" role="status">
            <div className="text-5xl font-extrabold text-red-600 leading-none font-mono">
              {formatZScoreValue(zScore)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-700">{getZScoreLabel(zScoreAbs)}</div>
              <div className="text-xs text-red-600 mt-1 leading-relaxed">
                O valor atual esta {zScoreAbs.toFixed(1)} desvios padrao {zScore > 0 ? 'acima' : 'abaixo'} do baseline historico. O limite de alerta e z &gt; 3.0.
              </div>
            </div>
          </div>

          {anomaly.recommendation && (
            <Recommendation
              title="Recomendacao pratica"
              description={anomaly.recommendation}
              severity="critical"
            />
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Descricao</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {anomaly.description}
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Detalhes do Desvio</h3>
            <CodeBlock
              code={JSON.stringify(anomaly.deviation_details, null, 2)}
              language="json"
            />
          </Card>
        </div>

        {alerts.length > 0 && (
          <div className="lg:col-span-2">
            <Card>
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Alertas Enviados</h3>
              </div>
              <div className="p-0">
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell header>Canal</Table.Cell>
                      <Table.Cell header>Status</Table.Cell>
                      <Table.Cell header>Enviado em</Table.Cell>
                      <Table.Cell header>Detalhes</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  {alerts.map((alert) => (
                    <Table.Row key={alert.id} className="border-b border-gray-100">
                      <Table.Cell>
                        <span className="flex items-center gap-2 text-sm font-medium capitalize">
                          {getChannelIcon(alert.channel)}
                          {alert.channel}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant={alertStatusVariant(alert.status)}>
                          {alert.status === 'sent' ? 'Enviado' : alert.status === 'failed' ? 'Falhou' : 'Pendente'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell className="text-sm text-gray-500">
                        {alert.sent_at ? formatDateShort(alert.sent_at) : '—'}
                      </Table.Cell>
                      <Table.Cell className="text-sm text-gray-600">
                        {alert.recipient || '—'}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelative(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `ha ${diffMin} min`;
  if (diffHours < 24) return `ha ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `ha ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  return formatDate(iso);
}
