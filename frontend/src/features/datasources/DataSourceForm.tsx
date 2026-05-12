import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../lib/api';
import type { DataSource, CreateDataSourceRequest, DataSourceType, DataSourceStatus } from '../../types/datasource';
import type { ApiResponse } from '../../types/api';

const TYPE_OPTIONS = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'google_sheets', label: 'Google Sheets' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'error', label: 'Error' },
];

export function DataSourceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [type, setType] = useState<DataSourceType>('postgres');
  const [status, setStatus] = useState<DataSourceStatus>('active');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existingData, isLoading } = useQuery({
    queryKey: ['datasource', id],
    queryFn: () => api.get<ApiResponse<DataSource>>(`/datasources/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingData?.data) {
      const ds = existingData.data;
      setName(ds.name);
      setType(ds.type);
      setStatus(ds.status);
      const cfg = ds.connection_config || {};
      setHost(String(cfg.host || ''));
      setPort(String(cfg.port || ''));
      setDatabase(String(cfg.database || ''));
      setUsername(String(cfg.username || ''));
      setPassword('');
    }
  }, [existingData]);

  const mutation = useMutation({
    mutationFn: (data: CreateDataSourceRequest) =>
      isEdit
        ? api.put<ApiResponse<DataSource>>(`/datasources/${id}`, data)
        : api.post<ApiResponse<DataSource>>('/datasources', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasources'] });
      navigate('/datasources');
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!type) newErrors.type = 'Type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const connectionConfig: Record<string, unknown> = { host, port: parseInt(port) || 5432, database, username };
    if (password) connectionConfig.password = password;

    mutation.mutate({
      name: name.trim(),
      type,
      connection_config: connectionConfig,
      status,
    });
  };

  if (isEdit && isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Edit DataSource</h1>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit DataSource' : 'Create DataSource'}</h1>
      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" name="name" value={name} onChange={e => setName(e.target.value)} error={errors.name} required />
          <Select label="Type" name="type" value={type} onChange={e => setType(e.target.value as DataSourceType)} options={TYPE_OPTIONS} error={errors.type} required />
          <Input label="Host" name="host" value={host} onChange={e => setHost(e.target.value)} />
          <Input label="Port" name="port" type="number" value={port} onChange={e => setPort(e.target.value)} />
          <Input label="Database" name="database" value={database} onChange={e => setDatabase(e.target.value)} />
          <Input label="User" name="username" value={username} onChange={e => setUsername(e.target.value)} />
          <Input label="Password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <Select label="Status" name="status" value={status} onChange={e => setStatus(e.target.value as DataSourceStatus)} options={STATUS_OPTIONS} />
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/datasources')}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>{isEdit ? 'Save Changes' : 'Save'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
