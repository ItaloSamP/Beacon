import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../lib/api';
import type { Pipeline, PipelineType } from '../../types/pipeline';
import type { DataSource } from '../../types/datasource';
import type { ApiResponse, PaginatedResponse } from '../../types/api';

const TYPE_OPTIONS = [
  { value: 'volume', label: 'Volume' },
  { value: 'null_check', label: 'Null Check' },
  { value: 'schema_change', label: 'Schema Change' },
  { value: 'distribution', label: 'Distribution' },
];

function isValidCron(expr: string): boolean {
  if (!expr.trim()) return true;
  const fields = expr.trim().split(/\s+/);
  return fields.length === 5;
}

function isValidJson(text: string): boolean {
  if (!text.trim()) return true;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export function PipelineForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [type, setType] = useState<PipelineType>('volume');
  const [dataSourceId, setDataSourceId] = useState('');
  const [schedule, setSchedule] = useState('');
  const [configText, setConfigText] = useState('{}');
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existingData, isLoading } = useQuery({
    queryKey: ['pipeline', id],
    queryFn: () => api.get<ApiResponse<Pipeline>>(`/pipelines/${id}`),
    enabled: isEdit,
  });

  const { data: dataSourcesData } = useQuery({
    queryKey: ['datasources'],
    queryFn: () => api.get<PaginatedResponse<DataSource>>('/datasources'),
  });

  const dataSources = dataSourcesData?.data ?? [];
  const dataSourceOptions = [
    { value: '', label: '— Select a Data Source —' },
    ...dataSources.map((ds) => ({ value: ds.id, label: ds.name })),
  ];

  useEffect(() => {
    if (existingData?.data) {
      const p = existingData.data;
      setName(p.name);
      setType(p.type);
      setDataSourceId(p.data_source_id);
      setSchedule(p.schedule ?? '');
      setConfigText(JSON.stringify(p.config, null, 2));
      setEnabled(p.enabled);
    }
  }, [existingData]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? api.put<ApiResponse<Pipeline>>(`/pipelines/${id}`, data)
        : api.post<ApiResponse<Pipeline>>('/pipelines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      navigate('/pipelines');
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!dataSourceId) newErrors.dataSourceId = 'Data source is required';
    if (schedule.trim() && !isValidCron(schedule)) newErrors.schedule = 'Must be a valid cron expression (5 fields)';
    if (!isValidJson(configText)) newErrors.config = 'Must be valid JSON';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let config: Record<string, unknown> = {};
    if (configText.trim()) {
      config = JSON.parse(configText);
    }

    mutation.mutate({
      name: name.trim(),
      type,
      data_source_id: dataSourceId,
      schedule: schedule.trim() || null,
      config,
      enabled,
    });
  };

  if (isEdit && isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Edit Pipeline</h1>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit Pipeline' : 'Create Pipeline'}</h1>
      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />
          <Select
            label="Type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as PipelineType)}
            options={TYPE_OPTIONS}
          />
          <Select
            label="Data Source"
            name="data_source_id"
            value={dataSourceId}
            onChange={(e) => setDataSourceId(e.target.value)}
            options={dataSourceOptions}
            error={errors.dataSourceId}
            placeholder="— Select a Data Source —"
          />
          <Input
            label="Schedule"
            name="schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            error={errors.schedule}
            helperText="Cron expression (e.g. 0 6 * * *)"
            placeholder="0 6 * * *"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="config" className="text-sm font-medium text-gray-700">
              Config
            </label>
            <textarea
              id="config"
              name="config"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${errors.config ? 'border-danger focus:ring-danger focus:border-danger' : 'border-gray-300'}`}
              aria-invalid={errors.config ? 'true' : undefined}
            />
            {errors.config && (
              <p className="text-xs text-danger" role="alert">{errors.config}</p>
            )}
          </div>
          <Toggle
            label="Enabled"
            checked={enabled}
            onChange={setEnabled}
          />
          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {(mutation.error as Error)?.message || 'An error occurred'}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/pipelines')}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save Changes' : 'Create Pipeline'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
