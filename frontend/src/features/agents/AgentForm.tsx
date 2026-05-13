import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../lib/api';
import type { Agent, CreateAgentRequest, AgentStatus } from '../../types/agent';
import type { ApiResponse } from '../../types/api';

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

export function AgentForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [status, setStatus] = useState<AgentStatus>('offline');
  const [version, setVersion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existingData, isLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => api.get<ApiResponse<Agent>>(`/agents/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingData?.data) {
      const agent = existingData.data;
      setName(agent.name);
      setStatus(agent.status);
      setVersion(agent.version || '');
    }
  }, [existingData]);

  const mutation = useMutation({
    mutationFn: (data: CreateAgentRequest) =>
      isEdit
        ? api.put<ApiResponse<Agent>>(`/agents/${id}`, data)
        : api.post<ApiResponse<Agent>>('/agents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      navigate('/agents');
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      name: name.trim(),
      status,
      version: version || undefined,
    });
  };

  if (isEdit && isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Edit Agent</h1>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit Agent' : 'Create Agent'}</h1>
      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" name="name" value={name} onChange={e => setName(e.target.value)} error={errors.name} required />
          <Select label="Status" name="status" value={status} onChange={e => setStatus(e.target.value as AgentStatus)} options={STATUS_OPTIONS} />
          <Input label="Version" name="version" value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 0.1.0" />
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/agents')}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>{isEdit ? 'Save Changes' : 'Save'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
